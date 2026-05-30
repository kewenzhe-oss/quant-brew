"""Test data_providers cache layer and helpers."""
from app.data_providers import safe_float, get_cached, set_cached, clear_cache


def test_safe_float_valid():
    assert safe_float("42.5") == 42.5
    assert safe_float(10) == 10.0


def test_safe_float_invalid():
    assert safe_float("bad") == 0.0
    assert safe_float(None, -1.0) == -1.0
    assert safe_float("", 0.0) == 0.0


def test_cache_round_trip():
    """set_cached + get_cached should return the same data."""
    set_cached("_test_unit", {"msg": "hello"}, 60)
    result = get_cached("_test_unit")
    assert result == {"msg": "hello"}
    clear_cache()
    assert get_cached("_test_unit") is None


def test_economic_calendar_not_empty():
    from app.data_providers.news import get_economic_calendar
    events = get_economic_calendar()
    assert isinstance(events, list)
    assert len(events) > 0
    assert "name" in events[0]
    assert "date" in events[0]


def test_adanos_sentiment_disabled_without_key():
    from app.data_providers.adanos_sentiment import fetch_adanos_market_sentiment

    result = fetch_adanos_market_sentiment("AAPL, TSLA", api_key="")

    assert result["enabled"] is False
    assert result["tickers"] == ["AAPL", "TSLA"]
    assert result["stocks"] == []
    assert "ADANOS_API_KEY" in result["error"]


def test_adanos_sentiment_fetches_and_normalizes(monkeypatch):
    from app.data_providers.adanos_sentiment import fetch_adanos_market_sentiment

    calls = []

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "stocks": [
                    {
                        "ticker": "AAPL",
                        "company_name": "Apple Inc.",
                        "sentiment_score": "0.21",
                        "buzz_score": "72.5",
                        "bullish_pct": "58",
                        "mentions": "128",
                        "unique_posts": "32",
                        "total_upvotes": "1204",
                        "trend": "rising",
                        "trend_history": [45.0, 51.5, 72.5],
                    }
                ]
            }

    class FakeSession:
        @staticmethod
        def get(url, **kwargs):
            calls.append((url, kwargs))
            return FakeResponse()

    monkeypatch.setenv("ADANOS_API_KEY", "adanos_test_key")
    result = fetch_adanos_market_sentiment(
        ["$aapl", "AAPL", "bad ticker"],
        source="reddit",
        days=14,
        base_url="https://api.example.test",
        session=FakeSession,
    )

    assert result["enabled"] is True
    assert result["tickers"] == ["AAPL"]
    assert result["stocks"][0] == {
        "ticker": "AAPL",
        "company_name": "Apple Inc.",
        "source": "reddit",
        "sentiment_score": 0.21,
        "buzz_score": 72.5,
        "bullish_pct": 58.0,
        "bearish_pct": None,
        "mentions": 128,
        "source_count": None,
        "subreddit_count": None,
        "unique_posts": 32,
        "unique_tweets": None,
        "trade_count": None,
        "market_count": None,
        "unique_traders": None,
        "total_upvotes": 1204,
        "total_liquidity": None,
        "trend": "rising",
        "trend_history": [45.0, 51.5, 72.5],
    }
    assert calls[0][0] == "https://api.example.test/reddit/stocks/v1/compare"
    assert calls[0][1]["params"] == {"tickers": "AAPL", "days": 14}
    assert calls[0][1]["headers"]["X-API-Key"] == "adanos_test_key"


def test_adanos_sentiment_fail_open_on_http_error(monkeypatch):
    from app.data_providers.adanos_sentiment import fetch_adanos_market_sentiment

    class FakeResponse:
        status_code = 429

    class FakeSession:
        @staticmethod
        def get(url, **kwargs):
            return FakeResponse()

    monkeypatch.setenv("ADANOS_API_KEY", "adanos_test_key")
    result = fetch_adanos_market_sentiment("NVDA", session=FakeSession)

    assert result["enabled"] is True
    assert result["stocks"] == []
    assert result["error"] == "Adanos API returned HTTP 429"


def test_adanos_sentiment_handles_list_payload_and_non_finite_numbers():
    from app.data_providers.adanos_sentiment import fetch_adanos_market_sentiment

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return [
                {
                    "symbol": "$MSFT",
                    "name": "Microsoft Corp.",
                    "sentiment": "NaN",
                    "buzz": "inf",
                    "mentions": "bad",
                    "market_count": "3",
                    "total_liquidity": "45200.5",
                    "trend_history": [12.0, 18.5],
                },
                "not-a-row",
                {},
            ]

    class FakeSession:
        @staticmethod
        def get(url, **kwargs):
            return FakeResponse()

    result = fetch_adanos_market_sentiment(
        None,
        api_key="adanos_test_key",
        session=FakeSession,
    )
    assert result["stocks"] == []
    assert result["error"] == "No valid stock tickers provided"

    result = fetch_adanos_market_sentiment(
        "MSFT",
        api_key="adanos_test_key",
        session=FakeSession,
    )

    assert result["stocks"][0]["ticker"] == "MSFT"
    assert result["stocks"][0]["company_name"] == "Microsoft Corp."
    assert result["stocks"][0]["sentiment_score"] is None
    assert result["stocks"][0]["buzz_score"] is None
    assert result["stocks"][0]["mentions"] is None
    assert result["stocks"][0]["market_count"] == 3
    assert result["stocks"][0]["total_liquidity"] == 45200.5
    assert result["stocks"][0]["trend_history"] == [12.0, 18.5]


def test_adanos_sentiment_validates_source():
    import pytest
    from app.data_providers.adanos_sentiment import normalize_source

    assert normalize_source("twitter") == "x"
    with pytest.raises(ValueError):
        normalize_source("unsupported")


def test_generate_heatmap_data_filtering(monkeypatch):
    """Verify that generate_heatmap_data filters stablecoins, RWAs (FIGR_HELOC), and illiquid tokens."""
    from app.data_providers.heatmap import generate_heatmap_data

    # Controlled list of mock crypto market cap data
    mock_crypto_data = [
        # Mainstream, high-signal, highly liquid (should PASS)
        {"symbol": "btc", "name": "Bitcoin", "price": 65000.0, "change_24h": 2.5, "market_cap": 1200000000.0, "volume_24h": 30000000.0},
        {"symbol": "eth", "name": "Ethereum", "price": 3500.0, "change_24h": -1.2, "market_cap": 400000000.0, "volume_24h": 15000000.0},
        {"symbol": "sol", "name": "Solana", "price": 150.0, "change_24h": 5.4, "market_cap": 60000000.0, "volume_24h": 5000000.0},
        
        # Blacklisted Stablecoins (should be EXCLUDED)
        {"symbol": "usdt", "name": "Tether", "price": 1.0, "change_24h": 0.01, "market_cap": 110000000.0, "volume_24h": 50000000.0},
        {"symbol": "usdc", "name": "USD Coin", "price": 1.0, "change_24h": 0.0, "market_cap": 30000000.0, "volume_24h": 8000000.0},
        
        # Blacklisted RWA / Credit pools (should be EXCLUDED)
        {"symbol": "figr_heloc", "name": "Figure HELOC", "price": 100.0, "change_24h": 0.0, "market_cap": 350000000.0, "volume_24h": 50.0},
        {"symbol": "buidl", "name": "BlackRock BUIDL", "price": 1.0, "change_24h": 0.0, "market_cap": 500000000.0, "volume_24h": 0.0},
        
        # Wrapped asset (should be EXCLUDED)
        {"symbol": "wbtc", "name": "Wrapped Bitcoin", "price": 65000.0, "change_24h": 2.5, "market_cap": 10000000.0, "volume_24h": 1000000.0},
        
        # High-cap but low-volume illiquid asset (velocity ratio < 0.0005) (should be EXCLUDED)
        {"symbol": "ghost", "name": "Illiquid Ghost Token", "price": 10.0, "change_24h": 0.0, "market_cap": 200000000.0, "volume_24h": 5000.0}, # ratio = 0.000025
        
        # Low-cap but highly liquid emerging asset (should PASS)
        {"symbol": "emerge", "name": "Emerging Token", "price": 0.5, "change_24h": 12.5, "market_cap": 5000000.0, "volume_24h": 200000.0}, # ratio = 0.04
    ]

    # Mock get_cached responses
    def mock_get_cached(key):
        if key == "crypto_heatmap":
            return mock_crypto_data
        # Keep other endpoints returning empty lists/dicts to focus on crypto
        if key in ("forex_pairs", "commodities", "stock_indices"):
            return []
        return None

    monkeypatch.setattr("app.data_providers.heatmap.get_cached", mock_get_cached)

    # Run the generator
    result = generate_heatmap_data()
    crypto_list = result.get("crypto", [])

    # Extract symbols that passed the logic
    passed_symbols = [coin["name"] for coin in crypto_list]

    # Verify mainstream and emerging high-signal assets passed
    assert "BTC" in passed_symbols
    assert "ETH" in passed_symbols
    assert "SOL" in passed_symbols
    assert "EMERGE" in passed_symbols

    # Verify blacklisted or low-velocity assets were excluded
    assert "USDT" not in passed_symbols
    assert "USDC" not in passed_symbols
    assert "FIGR_HELOC" not in passed_symbols
    assert "BUIDL" not in passed_symbols
    assert "WBTC" not in passed_symbols
    assert "GHOST" not in passed_symbols

    # Check structure compatibility with the frontend contract
    for coin in crypto_list:
        assert "name" in coin
        assert "fullName" in coin
        assert "value" in coin
        assert "price" in coin
        assert coin["name"] == coin["name"].upper()
