import requests 

def domain_lookup(domain):
    return {"domain": domain, "info": "sample"}

def ip_lookup(ip):
    return {"ip": ip, "country": "India"}

def run_osint(target):
    print("Running OSINT...")
    return {"domain": domain_lookup(target), "ip": ip_lookup("8.8.8.8")}
