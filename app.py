from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)
DATABASE = 'fish_sales.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        conn = get_db_connection()
        # Fish entries table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS fish_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,  -- Ensure name is unique
                weight REAL NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL
            )
        ''')
        
        # Customer orders table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS customer_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                payment_mode TEXT NOT NULL,
                status TEXT NOT NULL,
                order_date TEXT NOT NULL
            )
        ''')
        
        # Order items table (for storing individual fish items in each order)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                fish_name TEXT NOT NULL,
                weight REAL NOT NULL,
                rate REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES customer_orders (id)
            )
        ''')
        conn.commit()
        conn.close()

# Delete previous Sunday's fish entries
def delete_previous_sundays_data():
    today = datetime.now()
    previous_sunday = today - timedelta(days=today.weekday() + 7)
    previous_sunday_str = previous_sunday.strftime('%Y-%m-%d')

    conn = get_db_connection()
    conn.execute('DELETE FROM fish_entries WHERE date < ?', (previous_sunday_str,))
    conn.commit()
    conn.close()

# Fish entries routes
@app.route('/api/fish-entries', methods=['POST'])
def add_fish_entries():
    data = request.json
    fish_entries = data.get('fishEntries', [])

    if not fish_entries:
        return jsonify({'error': 'No fish entries provided'}), 400

    delete_previous_sundays_data()

    conn = get_db_connection()
    cursor = conn.cursor()
    duplicates = []

    for entry in fish_entries:
        # Check if a fish with the same name already exists
        cursor.execute('SELECT id FROM fish_entries WHERE name = ?', (entry['name'],))
        existing_fish = cursor.fetchone()

        if existing_fish:
            # If a duplicate exists, skip this entry
            duplicates.append(entry['name'])
        else:
            # Insert the new fish entry
            cursor.execute('''
                INSERT INTO fish_entries (name, weight, amount, date)
                VALUES (?, ?, ?, ?)
            ''', (entry['name'], entry['weight'], entry['amount'], datetime.now().strftime('%Y-%m-%d')))
    
    conn.commit()
    conn.close()

    if duplicates:
        return jsonify({
            'message': 'Some fish entries were skipped due to duplicates',
            'duplicates': duplicates
        }), 200
    else:
        return jsonify({'message': 'Fish entries added successfully'}), 201

@app.route('/api/fish-entries', methods=['GET'])
def get_fish_entries():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM fish_entries')
    fish_entries = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in fish_entries]), 200

@app.route('/api/fish-entries/<int:id>', methods=['DELETE'])
def delete_fish_entry(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM fish_entries WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Fish entry deleted successfully'}), 200

# Customer orders routes
@app.route('/api/orders', methods=['POST'])
def add_order():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Insert customer order
        cursor.execute('''
            INSERT INTO customer_orders (customer_name, customer_phone, payment_mode, status, order_date)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['customerName'],
            data['customerPhone'],
            data['paymentMode'],
            data['status'],
            datetime.now().strftime('%Y-%m-%d')
        ))
        
        order_id = cursor.lastrowid
        
        # Insert order items
        for item in data['fishEntries']:
            cursor.execute('''
                INSERT INTO order_items (order_id, fish_name, weight, rate)
                VALUES (?, ?, ?, ?)
            ''', (order_id, item['fish'], item['weight'], item['rate']))
        
        conn.commit()
        return jsonify({'message': 'Order added successfully'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/orders', methods=['GET'])
def get_orders():
    status = request.args.get('status', None)
    payment_mode = request.args.get('payment_mode', None)
    fish_name = request.args.get('fish_name', None)

    conn = get_db_connection()
    cursor = conn.cursor()

    query = '''
        SELECT co.*, GROUP_CONCAT(oi.fish_name || ',' || oi.weight || ',' || oi.rate, '|') as items
        FROM customer_orders co
        LEFT JOIN order_items oi ON co.id = oi.order_id
    '''
    
    conditions = []
    params = []
    
    if status:
        conditions.append('co.status = ?')
        params.append(status)
    if payment_mode:
        conditions.append('co.payment_mode = ?')
        params.append(payment_mode)
    if fish_name:
        conditions.append('oi.fish_name = ?')
        params.append(fish_name)
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    query += ' GROUP BY co.id'
    
    cursor.execute(query, params)
    orders = cursor.fetchall()
    conn.close()

    # Format the results
    formatted_orders = []
    for order in orders:
        order_dict = dict(order)
        if order_dict['items']:
            items = []
            for item_str in order_dict['items'].split('|'):
                if item_str:
                    fish_name, weight, rate = item_str.split(',')
                    items.append({
                        'fish_name': fish_name,
                        'weight': float(weight),
                        'rate': float(rate)
                    })
            order_dict['items'] = items
        else:
            order_dict['items'] = []
        formatted_orders.append(order_dict)

    return jsonify(formatted_orders), 200

@app.route('/api/orders/<int:id>', methods=['PUT'])
def update_order_status(id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE customer_orders
            SET status = ?
            WHERE id = ?
        ''', (data['status'], id))
        
        conn.commit()
        return jsonify({'message': 'Order status updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/orders/totals', methods=['GET'])
def get_order_totals():
    status = request.args.get('status', None)
    payment_mode = request.args.get('payment_mode', None)
    fish_name = request.args.get('fish_name', None)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query to calculate total amount from orders
    query = '''
        SELECT SUM(oi.rate) as total_amount
        FROM customer_orders co
        LEFT JOIN order_items oi ON co.id = oi.order_id
    '''
    
    conditions = []
    params = []
    
    if status:
        conditions.append('co.status = ?')
        params.append(status)
    if payment_mode:
        conditions.append('co.payment_mode = ?')
        params.append(payment_mode)
    if fish_name:
        conditions.append('oi.fish_name = ?')
        params.append(fish_name)
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    cursor.execute(query, params)
    total_amount_result = cursor.fetchone()
    total_amount = total_amount_result['total_amount'] if total_amount_result['total_amount'] else 0

    # Query to calculate total investment from fish entries
    investment_query = '''
        SELECT SUM(amount) as total_investment
        FROM fish_entries
    '''
    
    if fish_name:
        investment_query += ' WHERE name = ?'
        cursor.execute(investment_query, (fish_name,))
    else:
        cursor.execute(investment_query)
    
    total_investment_result = cursor.fetchone()
    total_investment = total_investment_result['total_investment'] if total_investment_result['total_investment'] else 0

    conn.close()

    profit = total_amount - total_investment

    return jsonify({
        'total_amount': total_amount,
        'total_investment': total_investment,
        'profit': profit
    }), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True)