#app routing
from flask import Blueprint, request, jsonify
import logging
from flask_login import login_required


#DB connection
from os import environ #env vars
import psycopg2 #DB connection
from psycopg2 import sql
# from psycopg2.extras import DictCursor

import time #logging time
import datetime
import decimal
import json

try:
    # take environment variables from .env.
    from dotenv import load_dotenv
    load_dotenv()  # take environment variables from .env.
except:
    pass

psql = Blueprint('psql', __name__)

################################################################
# Generic components
################################################################

################################ Setting up the connection
server_var = environ.get("DB_SERV_POSTGRES")
portnum_var = environ.get("DB_PORT_POSTGRES")
database_var = environ.get("DB_NAME_POSTGRES")
username_var = environ.get("DB_USER_POSTGRES")
password_var = environ.get("DB_PASS_POSTGRES")
conn=None


def connection_postgres_database(force=False):
    """
    Makes connection to the postgres database - postgres-test-smartcity
    Database - rdt or rdt_dev
    """
    conn=None

    def make_conn():
        conn = psycopg2.connect(
            host=server_var,
            dbname=database_var,
            port=portnum_var,
            user=username_var,
            password=password_var)
        conn.autocommit = True
        return conn

    if conn is None or force:
        # new conn object needed
        conn=make_conn()
    else:
        if conn.closed:
            # conn closed, replace by new connection
            conn=make_conn()
        else:
            # current conn object is still valid, reuse
            pass
    
    return conn

################################ Generic PSQL SELECT query with return value

def psql_select(query):
    try:
        # Make connection with the SQL-database
        cnxn = connection_postgres_database()
    except psycopg2.OperationalError:
        cnxn = connection_postgres_database(True)
    except Exception as e:
        print(e)
        return str(e), 400
    
    try:
        # cursor = cnxn.cursor(cursor_factory=DictCursor)
        cursor = cnxn.cursor()
        # run query
        cursor.execute(query)

        #get result as tuple-of-tuples
        psql_return = cursor.fetchall()
    except (Exception, psycopg2.DatabaseError) as e:
        print(e)
        return str(e), 400

    return psql_return

################################ Generic PSQL return to JSON

def psql_to_jsonarray(psql_return,output_column_names):

    json_return=[]
    for i in range(len(psql_return)):
        json_return.append({})
        for j in range(len(psql_return[i])):
            if isinstance(psql_return[i][j], decimal.Decimal):
                json_return[i][output_column_names[j]]=float(psql_return[i][j])
            else:
                json_return[i][output_column_names[j]]=psql_return[i][j]

    return jsonify(json_return)

################################################################
# Specific implementations
################################################################

################################ bouwlogistiek
@psql.route('/bouwlogistiek_od', methods=['POST'])
#@login_required
def bouwlogistiek_od():
    try: 
        # read POSTed data
        data = request.get_json(force=True)

        # Generate update query
        query = sql.SQL("""
            SELECT  gemnaam_herkomst_cbs, gemnaam_bestemming_cbs, ritten_per_huis_per_herkomst, ton_gewicht_per_huis_per_herkomst, vrachtwagen_per_huis_per_herkomst, bestelbus_per_huis_per_herkomst
            FROM    prd_bouwverkeerstromen.od_perhuis_2014
            WHERE   gemnaam_plan_bestemming={gemnaam_bestemming}
            AND     ritten_per_huis_per_herkomst > 0
        """).format(
            gemnaam_bestemming = sql.Literal(data['gemnaam_bestemming']))
        
        query_result = psql_select(query)

        result = {}

        for row in query_result:
            gemnaam_herkomst = row[0]
            aantal = float(row[2])
            gewicht = float(row[3])
            vrachtwagens = float(row[4])
            bestelbussen = float(row[5])
            result[gemnaam_herkomst] = [aantal, gewicht, vrachtwagens, bestelbussen] 
            

        return result
    
    except Exception as e:
        print(e)
        return str(e), 400




