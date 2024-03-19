# Code mostly based on: https://medium.com/customorchestrator/simple-reverse-proxy-server-using-flask-936087ce0afb
# More elaborate example: https://gist.github.com/stewartadam/f59f47614da1a9ab62d9881ae4fbe656
from flask import Blueprint,abort,request,Response
import requests

proxy = Blueprint('proxy', __name__)

approved_clients=set([
    'localhost:5000', 
    '127.0.0.1:5000', 
    'dtp-logistiek-dev.azurewebsites.net',
    'dtp-logistiek.azurewebsites.net',
    'dtp-logistiek-accept.azurewebsites.net'
])

# Proxy route definition
@proxy.route('/p/<path:path>',methods=['GET','POST'])
def approvePath(path):
    # Check if the client/requester is allowed to use this proxy
    host=request.host
    # if "-" in host:
    #     host='-'.join(request.host.split('-')[1:])
    if not host in approved_clients:
        print("URL of the current (web)app is not in approved_clients list: %s", host)
        abort(403,description="URL of the current (web)app is not in approved_clients list")
    
    if (path.startswith('https:/') and path[7]!='/'):
        path=path.replace('https:/','https://')
    elif (path.startswith('http:/') and path[6]!='/'):
        path=path.replace('http:/','http://')

    # Check if the destination is allowed to use this proxy
    # For each host/destination that is allowed over the proxy, define an "elif" clause & optionally define headers
    if path.startswith('https://service.pdok.nl/'):
        return proxyfun(path,request.args)
    elif path.startswith('https://plancapaciteit.nl/'):
        excluded_headers=['transfer-encoding','content-encoding','connection'] # LOWERCASE list of names of headers to delete
        headers_to_add=[('Access-Control-Allow-Origin','*'), ('Content-Encoding', 'compress')] # list of (name, value) pairs of headers to add
        return proxyfun(path,request.args,excluded_headers,headers_to_add)
    # elif path.startswith('https://enterStartOfPathHere.nl/AllSubdomainsWillBeAllowed'):
    #     excluded_headers=[] # list of names of headers to delete
    #     headers_to_add=[] # list of (name, value) pairs of headers to add
    #     return proxyfun(path,request.args,excluded_headers,headers_to_add)
    else:
        print("URL is not approved: %s", path)
        abort(403,description=f"Requested URL is not approved for use in this proxy. Requested URL was {path}")

# Function which handles the proxying itself
def proxyfun(path,args,excluded_headers=[],headers_to_add=[]):
    if request.method=='GET':
        resp = requests.get(path,args)
        headers = [(name, value) for (name, value) in  resp.raw.headers.items() if name.lower() not in excluded_headers] + headers_to_add
        return Response(resp.content, resp.status_code, headers)
    elif request.method=='POST':
        resp = requests.post(path,json=request.get_json())
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers] + headers_to_add
        return Response(resp.content, resp.status_code, headers)