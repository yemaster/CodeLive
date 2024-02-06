import os
import json

def getName(n):
    res = ""
    f = False
    for i in n:
        if i == '(':
            break
        if i != '-' and i != ' ':
            if f:
                res += i.upper()
                f = False
            else:
                res += i.lower()
        else:
            f = True
    return res

names = []
for i in os.listdir("./"):
    if i.split(".")[1] != "json":
        continue
    un = getName(i.split(".")[0])
    with open(i, "r") as f:
        t = json.load(f)
    with open(f"{un}.js", "w") as f:
        f.write(f"export const {un}={json.dumps(t)}")
    names.append(un)

with open("index.js", "w") as f:
    for i in names:
        f.write("import {" + i + "} from './" + i + ".js'\n")
    f.write("export {" + ",".join(names) + "}")