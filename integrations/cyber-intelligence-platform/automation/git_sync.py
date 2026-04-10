import os 
from datetime import datetime

def git_sync():
    print("Syncing Git...")
    os.system("git add .")
    os.system(f'git commit -m "Auto update {datetime.now()}"')
    os.system("git push")
