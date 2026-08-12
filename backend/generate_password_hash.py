"""Print a bcrypt hash without exposing the password in shell history."""
from getpass import getpass

import bcrypt

password = getpass("Admin password: ")
confirm = getpass("Confirm password: ")
if password != confirm:
    raise SystemExit("Passwords did not match.")
print(bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode())
