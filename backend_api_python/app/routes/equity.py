from flask import Blueprint, request, jsonify
from app.data_providers.yfinance_provider import get_info, get_quote, get_historical, get_financials, get_technicals, get_equity_timeseries
from app.services.financial_adapter import normalize_financials
from app.utils.cache import CacheManager
from app.utils.logger import get_logger

logger = get_logger(__name__)

equity_bp = Blueprint('equity_bp', __name__)
cache_manager = CacheManager()

@equity_bp.route('/info', methods=['GET'])
def fetch_info():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    symbol = symbol.upper()
    cache_key = f"equity:info:{symbol}"
    
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        data = get_info(symbol)
        if "error" not in data:
            cache_manager.set(cache_key, data, ttl=86400) # 24h cache for info
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching info for {symbol}: {str(e)}")
        return jsonify({"error": "Failed to fetch data"}), 500

@equity_bp.route('/quote', methods=['GET'])
def fetch_quote():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    symbol = symbol.upper()
    cache_key = f"equity:quote:{symbol}"
    
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        data = get_quote(symbol)
        if "error" not in data:
            cache_manager.set(cache_key, data, ttl=30) # 30s cache for quote
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {str(e)}")
        return jsonify({"error": "Failed to fetch data"}), 500

@equity_bp.route('/history', methods=['GET'])
def fetch_history():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    symbol = symbol.upper()
    period = request.args.get('period', '6mo')
    interval = request.args.get('interval', '1d')
    
    cache_key = f"equity:history:{symbol}:{period}:{interval}"
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        data = get_historical(symbol, period, interval)
        if data:
            # 1 hour cache for history, enough for most uses without hitting limits
            cache_manager.set(cache_key, data, ttl=3600) 
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {str(e)}")
        return jsonify({"error": "Failed to fetch data"}), 500

@equity_bp.route('/financials', methods=['GET'])
def fetch_financials():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    symbol = symbol.upper()
    period = request.args.get('period', 'annual')
    cache_key = f"equity:financials:{symbol}:{period}"
    
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        raw_data = get_financials(symbol, period=period)
        if "error" not in raw_data:
            # Financials update very rarely, 24h cache is safe
            normalized_data = normalize_financials(raw_data, symbol, period)
            cache_manager.set(cache_key, normalized_data, ttl=86400)
            return jsonify(normalized_data)
        return jsonify(raw_data)
    except Exception as e:
        logger.error(f"Error fetching financials for {symbol}: {str(e)}")
        return jsonify({"error": "Failed to fetch data"}), 500

@equity_bp.route('/technicals', methods=['GET'])
def fetch_technicals():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    
    symbol = symbol.upper()
    period = request.args.get('period', '1y')
    cache_key = f"equity:technicals:{symbol}:{period}"
    
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        data = get_technicals(symbol, period=period)
        if "error" not in data:
            # Technical indicators derived from EOD daily data
            cache_manager.set(cache_key, data, ttl=3600)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching technicals for {symbol}: {str(e)}")
        return jsonify({"error": "Failed to fetch data"}), 500

@equity_bp.route('/timeseries/<symbol>/<metric_key>', methods=['GET'])
def fetch_timeseries(symbol, metric_key):
    symbol = symbol.upper()
    metric_key = metric_key.lower()
    
    period = request.args.get('period', '1y')
    interval = request.args.get('interval', '1d')
    
    cache_key = f"equity:timeseries:{symbol}:{metric_key}:{period}:{interval}"
    
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached)
        
    try:
        data = get_equity_timeseries(symbol, metric_key, period=period, interval=interval)
        if "error" not in data:
            # Cache timeseries for 1 hour
            cache_manager.set(cache_key, data, ttl=3600)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching timeseries for {symbol} - {metric_key}: {str(e)}")
        return jsonify({
            "metricKey": metric_key,
            "name": metric_key,
            "series": [],
            "dataQuality": {"status": "error", "errorMsg": "Failed to fetch data"}
        }), 500
