from django.db import migrations


SEED_SECTIONS = [
    {
        "id": "kommando",
        "title": "Kommando",
        "members": [
            {
                "photo": "114",
                "stbnr": 114,
                "name": "Wolfgang Niederauer",
                "dienstgrad": "HBI",
                "dienstgrad_img": "Dgrd_hbi.noe.svg",
                "position": "Kommandant",
            },
            {
                "photo": "159",
                "stbnr": 159,
                "name": "Michael Haller",
                "dienstgrad": "OBI",
                "dienstgrad_img": "Dgrd_obi.noe.svg",
                "position": "Kommandant Stv.",
            },
            {
                "photo": "214",
                "stbnr": 214,
                "name": "Felix Fischer",
                "dienstgrad": "OV",
                "dienstgrad_img": "Dgrd_ov.noe.svg",
                "position": "Leiter des Verwaltungsdienstes",
            },
        ],
    },
    {
        "id": "zugskommandanten",
        "title": "Zugskommandanten",
        "members": [
            {
                "photo": "148",
                "stbnr": 148,
                "name": "Bernhard Wolf",
                "dienstgrad": "BM",
                "dienstgrad_img": "Dgrd_bm.noe.svg",
                "position": "Zugskommandant",
            },
            {
                "photo": "119",
                "stbnr": 119,
                "name": "Klaus Richter",
                "dienstgrad": "HBM",
                "dienstgrad_img": "Dgrd_hbm.noe.svg",
                "position": "Zugskommandant",
            },
        ],
    },
    {
        "id": "gruppenkommandanten",
        "title": "Gruppenkommandanten",
        "members": [
            {
                "photo": "187",
                "stbnr": 187,
                "name": "Matthias Strauby",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "Gruppenkommandant",
            },
            {
                "photo": "208",
                "stbnr": 208,
                "name": "Samuel Hierreich",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "Gruppenkommandant",
            },
            {
                "photo": "142",
                "stbnr": 142,
                "name": "Richard Widmann",
                "dienstgrad": "HLM",
                "dienstgrad_img": "Dgrd_hlm.noe.svg",
                "position": "Gruppenkommandant",
            },
            {
                "photo": "157",
                "stbnr": 157,
                "name": "Dominik Radlinger",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "Gruppenkommandant",
            },
            {
                "photo": "163",
                "stbnr": 163,
                "name": "Dominic Hainzl",
                "dienstgrad": "OFM",
                "dienstgrad_img": "Dgrd_ofm.noe.svg",
                "position": "Gruppenkommandant",
            },
        ],
    },
    {
        "id": "sachbearbeiter",
        "title": "Sachbearbeiter",
        "members": [
            {
                "photo": "182",
                "stbnr": 182,
                "name": "Heinz Steinhauser",
                "dienstgrad": "HBM",
                "dienstgrad_img": "Dgrd_hbm.noe.svg",
                "position": "Fahrmeister",
            },
            {
                "photo": "199",
                "stbnr": 199,
                "name": "Christoph Kellner",
                "dienstgrad": "BM",
                "dienstgrad_img": "Dgrd_bm.noe.svg",
                "position": "Zeugmeister",
            },
            {
                "photo": "X",
                "stbnr": None,
                "name": "Nicht definiert",
                "dienstgrad": "BM",
                "dienstgrad_img": "Dgrd_bm.noe.svg",
                "position": "Ausbilder",
            },
            {
                "photo": "197",
                "stbnr": 197,
                "name": "Paul Kondziolka",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "Jugendbetreuer",
            },
            {
                "photo": "156",
                "stbnr": 156,
                "name": "Richard Kager",
                "dienstgrad": "FKUR",
                "dienstgrad_img": "Dgrd_fkur.noe.svg",
                "position": "Feuerwehrkurat",
            },
            {
                "photo": "187",
                "stbnr": 187,
                "name": "Matthias Strauby",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "SB Nachrichtendienst",
            },
            {
                "photo": "208",
                "stbnr": 208,
                "name": "Samuel Hierreich",
                "dienstgrad": "LM",
                "dienstgrad_img": "Dgrd_lm.noe.svg",
                "position": "SB Schadstoff",
            },
            {
                "photo": "X",
                "stbnr": None,
                "name": "Angela Kastner",
                "dienstgrad": "SB",
                "dienstgrad_img": "Dgrd_sbea.noe.svg",
                "position": "SB Feuerwehr Medizinischer Dienst (FMD)",
            },
            {
                "photo": "146",
                "stbnr": 146,
                "name": "Martin Freywald",
                "dienstgrad": "EOV",
                "dienstgrad_img": "Dgrd_ov.noe.svg",
                "position": "SB Vorbeugender Brandschutz",
            },
            {
                "photo": "234",
                "stbnr": 234,
                "name": "Vanessa Radosovits",
                "dienstgrad": "SB",
                "dienstgrad_img": "Dgrd_sbea.noe.svg",
                "position": "SB Oeffentlichkeitsarbeit",
            },
            {
                "photo": "170",
                "stbnr": 170,
                "name": "Michael Reichenauer",
                "dienstgrad": "V",
                "dienstgrad_img": "Dgrd_v.noe.svg",
                "position": "SB EDV",
            },
            {
                "photo": "140",
                "stbnr": 140,
                "name": "Harald Wolf",
                "dienstgrad": "EOBI",
                "dienstgrad_img": "Dgrd_obi.noe.svg",
                "position": "SB Atemschutz",
            },
        ],
    },
]


def seed_default_dienstposten(apps, schema_editor):
    HomepageDienstposten = apps.get_model("homepage", "HomepageDienstposten")
    Mitglied = apps.get_model("mitglieder", "Mitglied")

    if HomepageDienstposten.objects.exists():
        return

    stbnr_values = sorted(
        {
            member["stbnr"]
            for section in SEED_SECTIONS
            for member in section["members"]
            if member.get("stbnr") is not None
        }
    )

    members_by_stbnr = {
        item.stbnr: item
        for item in Mitglied.objects.filter(stbnr__in=stbnr_values)
    }

    for section_index, section in enumerate(SEED_SECTIONS, start=1):
        for member_index, member in enumerate(section["members"], start=1):
            stbnr = member.get("stbnr")
            mitglied = members_by_stbnr.get(stbnr) if stbnr is not None else None

            HomepageDienstposten.objects.create(
                section_id=section["id"],
                section_title=section["title"],
                section_order=section_index,
                position=member["position"],
                position_order=member_index,
                mitglied=mitglied,
                fallback_name=member["name"],
                fallback_dienstgrad=member["dienstgrad"],
                fallback_photo=member["photo"],
                fallback_dienstgrad_img=member["dienstgrad_img"],
            )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("homepage", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_dienstposten, noop_reverse),
    ]
