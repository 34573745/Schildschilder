#!/usr/bin/env python3
"""Zet het tabblad 'Wapens' van data/schildschilder_wapens.xlsx om naar data/wapens.json.

Gebruik (vanuit de hoofdmap van het project):

    python3 tools/xlsx-naar-json.py

Er zijn geen extra pakketten nodig: het script gebruikt alleen de standaardbibliotheek van Python.
Kolommen worden op naam gelezen (zie het tabblad 'Uitleg'). Lege rijen worden overgeslagen.
"""

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

HOOFDMAP = Path(__file__).resolve().parent.parent
BRON = HOOFDMAP / "data" / "schildschilder_wapens.xlsx"
DOEL = HOOFDMAP / "data" / "wapens.json"
TABBLAD = "Wapens"

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

# Kolommen die het spel gebruikt. 'termen', 'schildvorm' en 'notities' gaan mee voor later gebruik,
# maar 'notities' is intern en wordt bewust niet meegenomen.
KOLOMMEN = [
    "id", "volgorde", "gemeente", "provincie", "blazoen", "schildvorm", "termen",
    "afbeelding", "wiki_url", "bron_url", "auteur", "licentie",
]


def kolom_index(celref):
    letters = re.match(r"[A-Z]+", celref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def lees_tabblad(pad, naam):
    with zipfile.ZipFile(pad) as z:
        gedeeld = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                gedeeld.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

        boek = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        doelen = {r.get("Id"): r.get("Target") for r in rels.findall("rel:Relationship", NS)}
        blad_pad = None
        for blad in boek.find("m:sheets", NS):
            if blad.get("name") == naam:
                doel = doelen[blad.get(f"{{{NS['r']}}}id")].lstrip("/")
                blad_pad = doel if doel.startswith("xl/") else "xl/" + doel
        if blad_pad is None:
            sys.exit(f"Tabblad '{naam}' niet gevonden in {pad.name}.")

        root = ET.fromstring(z.read(blad_pad))
        rijen = []
        for rij in root.iter(f"{{{NS['m']}}}row"):
            waarden = {}
            for cel in rij.findall("m:c", NS):
                soort = cel.get("t")
                if soort == "inlineStr":
                    waarde = "".join(t.text or "" for t in cel.iter(f"{{{NS['m']}}}t"))
                else:
                    v = cel.find("m:v", NS)
                    if v is None:
                        continue
                    waarde = gedeeld[int(v.text)] if soort == "s" else v.text
                waarden[kolom_index(cel.get("r"))] = waarde
            if waarden:
                breedte = max(waarden) + 1
                rijen.append([waarden.get(i) for i in range(breedte)])
        return rijen


def schoon(waarde):
    if waarde is None:
        return ""
    return str(waarde).strip()


def main():
    rijen = lees_tabblad(BRON, TABBLAD)
    if not rijen:
        sys.exit("Het tabblad is leeg.")
    kop = [schoon(k) for k in rijen[0]]
    ontbreekt = [k for k in KOLOMMEN if k not in kop]
    if ontbreekt:
        sys.exit("Deze kolommen ontbreken in het tabblad: " + ", ".join(ontbreekt))

    wapens = []
    gezien = set()
    for rij in rijen[1:]:
        rij = rij + [None] * (len(kop) - len(rij))
        item = {k: schoon(rij[kop.index(k)]) for k in KOLOMMEN}
        if not item["id"]:
            continue
        if item["id"] in gezien:
            sys.exit(f"Dubbel id: {item['id']}")
        gezien.add(item["id"])
        volgorde = item["volgorde"]
        try:
            item["volgorde"] = int(float(volgorde)) if volgorde else None
        except ValueError:
            sys.exit(f"Ongeldige volgorde bij {item['id']}: {volgorde!r}")
        item["termen"] = [t.strip() for t in item["termen"].split(";") if t.strip()]
        if not (HOOFDMAP / "wapens" / item["afbeelding"]).is_file():
            print(f"Let op: wapens/{item['afbeelding']} bestaat niet (wapen {item['id']}).")
        wapens.append(item)

    wapens.sort(key=lambda w: (w["volgorde"] is None, w["volgorde"] or 0, w["id"]))
    DOEL.write_text(json.dumps(wapens, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(wapens)} wapens geschreven naar {DOEL.relative_to(HOOFDMAP)}.")


if __name__ == "__main__":
    main()
