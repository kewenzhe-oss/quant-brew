from run import create_app
import json

app = create_app()

def test_endpoints():
    with app.test_client() as client:
        print("Testing /api/equity/info?symbol=AAPL...")
        response = client.get('/api/equity/info?symbol=AAPL')
        print(f"Status: {response.status_code}")
        data = response.get_json()
        print(f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        if "error" in data:
            print(f"Error: {data['error']}")
        else:
            print(f"Company: {data.get('company_name')}, Market Cap: {data.get('market_cap')}")
            
        print("\nTesting /api/equity/quote?symbol=AAPL...")
        response = client.get('/api/equity/quote?symbol=AAPL')
        print(f"Status: {response.status_code}")
        data = response.get_json()
        if "error" in data:
            print(f"Error: {data['error']}")
        else:
            print(f"Price: {data.get('price')}, Change: {data.get('change')} ({data.get('change_percent')}%)")
            
        print("\nTesting /api/equity/history?symbol=AAPL...")
        response = client.get('/api/equity/history?symbol=AAPL')
        print(f"Status: {response.status_code}")
        data = response.get_json()
        print(f"Data type: {type(data)}, length: {len(data) if isinstance(data, list) else 'N/A'}")
        if isinstance(data, list) and len(data) > 0:
            print(f"First item: {data[0]}")
            print(f"Last item: {data[-1]}")
            
        print("\nTesting /api/equity/financials?symbol=AAPL...")
        response = client.get('/api/equity/financials?symbol=AAPL')
        print(f"Status: {response.status_code}")
        data = response.get_json()
        print(f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        if "error" in data:
            print(f"Error: {data['error']}")
        else:
            inc_stmt = data.get('income_statement', {})
            print(f"Income Statement Dates: {list(inc_stmt.keys())}")

if __name__ == '__main__':
    test_endpoints()
