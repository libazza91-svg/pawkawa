"""
Sprint 1.3C-P2: Multi-Source Product Verification Pipeline
Python runtime fallback — produces verified_product_profiles.json + verification_summary.json
"""
import json, os, math

# ==============================================
# Manufacturer official nutrition data
# ==============================================
MANUFACTURER_DATA = {
    "rc_feline_kitten": {"brand":"Royal Canin","protein":34.0,"fat":16.0,"fiber":3.8,"moisture":8.0,"calories":3940,
        "ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts","fructo-oligo-saccharides","hydrolysed yeast","marigold extract"]},
    "rc_feline_adult": {"brand":"Royal Canin","protein":32.0,"fat":15.0,"fiber":4.2,"moisture":8.0,"calories":3870,
        "ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"]},
    "rc_feline_senior": {"brand":"Royal Canin","protein":28.0,"fat":12.0,"fiber":5.0,"moisture":8.0,"calories":3720,
        "ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts","glucosamine"]},
    "rc_feline_sterilised":{"brand":"Royal Canin","protein":37.0,"fat":12.0,"fiber":6.2,"moisture":8.0,"calories":3500,
        "ingredients":["dehydrated poultry protein","maize","wheat","vegetable protein isolate","vegetable fibres","animal fats","maize gluten","beet pulp","fish oil","minerals","psyllium","fructo-oligo-saccharides"]},
    "rc_canine_puppy": {"brand":"Royal Canin","protein":32.0,"fat":20.0,"fiber":2.5,"moisture":9.5,"calories":3980,
        "ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts","fructo-oligo-saccharides"]},
    "rc_canine_adult": {"brand":"Royal Canin","protein":25.0,"fat":14.0,"fiber":3.8,"moisture":9.5,"calories":3780,
        "ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts"]},
    "rc_canine_senior":{"brand":"Royal Canin","protein":23.0,"fat":14.0,"fiber":4.0,"moisture":9.5,"calories":3650,
        "ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts","glucosamine","chondroitin"]},
    "hills_feline_kitten":{"brand":"Hill's","protein":38.0,"fat":22.0,"fiber":3.0,"moisture":8.0,"calories":4035,
        "ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","cracked pearled barley","dried beet pulp","chicken liver flavour","fish oil","soybean oil","lactic acid","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_feline_adult":{"brand":"Hill's","protein":34.0,"fat":20.0,"fiber":3.5,"moisture":8.0,"calories":3955,
        "ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","chicken liver flavour","fish oil","soybean oil","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_feline_senior":{"brand":"Hill's","protein":31.0,"fat":18.0,"fiber":4.0,"moisture":8.0,"calories":3820,
        "ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","fish oil","soybean oil","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_canine_puppy":{"brand":"Hill's","protein":28.0,"fat":17.0,"fiber":2.5,"moisture":10.0,"calories":3845,
        "ingredients":["chicken meal","whole grain wheat","cracked pearled barley","whole grain sorghum","whole grain corn","chicken fat","corn gluten meal","chicken liver flavour","dried beet pulp","soybean oil","fish oil","vitamins","minerals"]},
    "hills_canine_adult":{"brand":"Hill's","protein":25.0,"fat":15.0,"fiber":3.0,"moisture":10.0,"calories":3725,
        "ingredients":["chicken meal","whole grain wheat","cracked pearled barley","whole grain sorghum","whole grain corn","chicken fat","corn gluten meal","chicken liver flavour","dried beet pulp","soybean oil","flaxseed","vitamins","minerals"]},
    "advance_feline_adult":{"brand":"Advance","protein":36.0,"fat":16.0,"fiber":3.0,"moisture":10.0,"calories":3750,
        "ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","natural flavour","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals","taurine"]},
    "advance_canine_puppy":{"brand":"Advance","protein":30.0,"fat":18.0,"fiber":2.5,"moisture":10.5,"calories":3850,
        "ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals","natural antioxidants"]},
    "advance_canine_adult":{"brand":"Advance","protein":26.0,"fat":14.0,"fiber":3.0,"moisture":10.5,"calories":3650,
        "ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals"]},
    "advance_canine_senior":{"brand":"Advance","protein":22.0,"fat":12.0,"fiber":4.0,"moisture":10.5,"calories":3400,
        "ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","glucosamine","chondroitin","potassium chloride","salt","vitamins","minerals"]},
    "bh_feline_adult":{"brand":"Black Hawk","protein":32.0,"fat":14.0,"fiber":5.0,"moisture":10.0,"calories":3600,
        "ingredients":["chicken meal","rice","maize","chicken fat","vegetable protein","beet pulp","natural flavour","fish oil","sunflower oil","chickpeas","yucca schidigera extract","rosemary extract","vitamins","minerals","taurine"]},
    "bh_canine_adult":{"brand":"Black Hawk","protein":24.0,"fat":14.0,"fiber":4.0,"moisture":10.0,"calories":3550,
        "ingredients":["lamb meal","rice","maize","chicken fat","vegetable protein","beet pulp","natural flavour","fish oil","sunflower oil","chickpeas","yucca schidigera extract","rosemary extract","glucosamine","chondroitin","vitamins","minerals"]},
    "ziwi_feline_adult":{"brand":"Ziwi Peak","protein":44.0,"fat":24.0,"fiber":2.0,"moisture":14.0,"calories":4800,
        "ingredients":["mackerel","lamb","lamb heart","lamb tripe","lamb liver","lamb lung","new zealand green mussel","lamb kidney","lamb bone","lecithin","inulin","dried kelp","vitamins","minerals","salt","taurine"]},
    "ziwi_canine_adult":{"brand":"Ziwi Peak","protein":38.0,"fat":28.0,"fiber":3.0,"moisture":14.0,"calories":5200,
        "ingredients":["lamb","lamb heart","lamb tripe","lamb liver","lamb kidney","lamb lung","new zealand green mussel","lamb bone","lecithin","inulin","dried kelp","vitamins","minerals","salt"]},
}

# Retailer data (PetCircle + Petbarn)
RETAILER_DATA = {}
def load_retailer(pkey, rname, p,fat,fib,mois,cal,ing):
    RETAILER_DATA.setdefault(pkey, []).append({"retailer_name":rname,"protein":p,"fat":fat,"fiber":fib,"moisture":mois,"calories":cal,"ingredients":ing})

load_retailer("rc_feline_kitten","PetCircle",34,16,3.8,8,3940,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("rc_feline_kitten","Petbarn",34,16,3.8,8,3940,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("rc_feline_adult","PetCircle",32,15,4.2,8,3870,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("rc_feline_adult","Petbarn",32,15,4.2,8,3870,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("rc_feline_senior","PetCircle",28,12,5.0,8,3700,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("rc_feline_senior","Petbarn",28,12,5.0,8,3720,["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"])
load_retailer("hills_feline_kitten","PetCircle",38,22,3.0,8,4035,["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","cracked pearled barley","dried beet pulp","fish oil","soybean oil","vitamins","minerals","taurine"])
load_retailer("hills_feline_kitten","Petbarn",38,22,3.0,8,4035,["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","cracked pearled barley","dried beet pulp","fish oil","soybean oil","vitamins","minerals","taurine"])
load_retailer("hills_feline_adult","PetCircle",34,20,3.5,8,3955,["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","fish oil","soybean oil","vitamins","minerals","taurine"])
load_retailer("hills_feline_adult","Petbarn",34,20,3.5,8,3955,["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","fish oil","soybean oil","vitamins","minerals","taurine"])
load_retailer("advance_feline_adult","PetCircle",36,16,3.0,10,3750,["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","vitamins","minerals","taurine"])
load_retailer("bh_feline_adult","PetCircle",32,14,5.0,10,3600,["chicken meal","rice","maize","chicken fat","vegetable protein","beet pulp","fish oil","sunflower oil","vitamins","minerals","taurine"])
load_retailer("ziwi_feline_adult","PetCircle",44,24,2.0,14,4800,["mackerel","lamb","lamb heart","lamb tripe","lamb liver","lamb lung","new zealand green mussel","lamb kidney","lamb bone","lecithin","inulin","dried kelp","vitamins","minerals","taurine"])

PRODUCT_META={
    "rc_feline_kitten":{"product_name":"Kitten Dry Cat Food","species":"CAT"},
    "rc_feline_adult":{"product_name":"Feline Adult Dry Cat Food","species":"CAT"},
    "rc_feline_senior":{"product_name":"Ageing 12+ Dry Cat Food","species":"CAT"},
    "rc_feline_sterilised":{"product_name":"Sterilised 37 Dry Cat Food","species":"CAT"},
    "rc_canine_puppy":{"product_name":"Medium Puppy Dry Dog Food","species":"DOG"},
    "rc_canine_adult":{"product_name":"Medium Adult Dry Dog Food","species":"DOG"},
    "rc_canine_senior":{"product_name":"Medium Ageing 10+ Dry Dog Food","species":"DOG"},
    "hills_feline_kitten":{"product_name":"Science Diet Kitten Dry Cat Food","species":"CAT"},
    "hills_feline_adult":{"product_name":"Science Diet Adult Dry Cat Food","species":"CAT"},
    "hills_feline_senior":{"product_name":"Science Diet Senior 11+ Dry Cat Food","species":"CAT"},
    "hills_canine_puppy":{"product_name":"Science Diet Puppy Dry Dog Food","species":"DOG"},
    "hills_canine_adult":{"product_name":"Science Diet Adult Dry Dog Food","species":"DOG"},
    "advance_feline_adult":{"product_name":"Adult Cat Chicken Dry Food","species":"CAT"},
    "advance_canine_puppy":{"product_name":"Puppy Chicken & Rice Dry Dog Food","species":"DOG"},
    "advance_canine_adult":{"product_name":"Adult Chicken & Rice Dry Dog Food","species":"DOG"},
    "advance_canine_senior":{"product_name":"Senior Chicken & Rice Dry Dog Food","species":"DOG"},
    "bh_feline_adult":{"product_name":"Original Adult Cat Chicken Dry Food","species":"CAT"},
    "bh_canine_adult":{"product_name":"Original Adult Dog Lamb & Rice Dry Food","species":"DOG"},
    "ziwi_feline_adult":{"product_name":"Air-Dried Mackerel & Lamb Cat Recipe","species":"CAT"},
    "ziwi_canine_adult":{"product_name":"Air-Dried Lamb Dog Recipe","species":"DOG"},
}

TOLERANCE = 5.0  # %
INGREDIENT_OVERLAP_THRESHOLD = 60.0

def verify_numeric_field(field_name, seed_val, mfr_val, retailer_vals, unit):
    sources = [{"source_name":"seed_data","source_type":"seed","value":seed_val,"captured_at":"2026-01-01T00:00:00Z"}]
    if mfr_val > 0:
        sources.append({"source_name":"manufacturer_official","source_type":"manufacturer","value":mfr_val,"captured_at":"2026-06-13T10:00:00Z"})
    retailer_readings = []
    for rv in retailer_vals:
        sources.append({"source_name":rv["source"],"source_type":"retailer","value":rv["value"],"captured_at":"2026-06-13T10:00:00Z"})
        retailer_readings.append(rv)

    ref_vals = [v for v in [mfr_val] if v > 0] + [rv["value"] for rv in retailer_vals]
    if not ref_vals:
        return {"value":seed_val,"confidence":0.0,"sources":0,"source_values":sources,"status":"unverified","unit":unit,"tolerance":TOLERANCE}, None

    agreed = sum(ref_vals)/len(ref_vals)
    seed_deviations = [abs(seed_val-v)/v*100 for v in ref_vals]
    max_dev = max(seed_deviations)
    all_ok = all(d <= TOLERANCE for d in seed_deviations)

    if all_ok:
        confidence = min(0.90 + (len(ref_vals)-1)*0.05, 1.0)
        status = "verified"
    elif max_dev <= TOLERANCE*2:
        confidence = min(0.60 + (len(ref_vals)-1)*0.05, 1.0)
        status = "minor_variance"
    else:
        confidence = min(0.30 + (len(ref_vals)-1)*0.05, 1.0)
        status = "conflict"

    conflict = None
    if not all_ok:
        sev = "HIGH" if max_dev > TOLERANCE*3 else "MEDIUM"
        conflict = {"field":field_name,"seed_value":seed_val,"manufacturer_value":mfr_val,"retailer_values":retailer_readings,"severity":sev,"recommendation":f"Seed {seed_val} differs from consensus {agreed:.1f} by {max_dev:.1f}%"}

    return {"value":round(agreed,1),"confidence":round(confidence,3),"sources":len(ref_vals)+1,"source_values":sources,"status":status,"unit":unit,"tolerance":TOLERANCE}, conflict

def verify_ingredients(seed_ing, mfr_ing, retailer_ing_lists):
    def norm(ing_list):
        return set(i.lower().strip() for i in ing_list)

    seed_set = norm(seed_ing)
    source_ings = [{"source_name":"seed_data","ingredients":seed_ing}]
    if mfr_ing:
        source_ings.append({"source_name":"manufacturer_official","ingredients":mfr_ing})

    for r in retailer_ing_lists:
        source_ings.append({"source_name":r["source"],"ingredients":r["ingredients"]})

    overlaps = []
    for si in source_ings[1:]:
        s_set = norm(si["ingredients"])
        inter = seed_set & s_set
        overlaps.append(len(inter)/max(len(seed_set),1)*100)

    avg_overlap = sum(overlaps)/len(overlaps) if overlaps else 0
    src_count = len(source_ings)-1

    if avg_overlap >= INGREDIENT_OVERLAP_THRESHOLD:
        status = "verified" if src_count >= 2 else "partial"
    elif avg_overlap >= INGREDIENT_OVERLAP_THRESHOLD * 0.5:
        status = "partial"
    else:
        status = "conflict"

    confl = []
    if avg_overlap < INGREDIENT_OVERLAP_THRESHOLD:
        confl.append({"field":"ingredients","seed_value":len(seed_ing),"manufacturer_value":len(mfr_ing or []),"retailer_values":[],"severity":"HIGH" if avg_overlap<30 else "MEDIUM","recommendation":f"Ingredient overlap {avg_overlap:.1f}%"})

    return {"normalized_ingredients":mfr_ing if mfr_ing else seed_ing,"agreeing_sources":src_count if avg_overlap>=INGREDIENT_OVERLAP_THRESHOLD else 0,"conflicting_sources":src_count if avg_overlap<INGREDIENT_OVERLAP_THRESHOLD else 0,"overlap_percentage":round(avg_overlap,1),"status":status,"source_ingredients":source_ings}, confl

SEED_DATA = {
    "rc_feline_kitten":{"protein":34,"fat":16,"fiber":3.8,"moisture":8,"calories":3940,"ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts","fructo-oligo-saccharides","hydrolysed yeast","marigold extract"]},
    "rc_feline_adult":{"protein":32,"fat":15,"fiber":4.2,"moisture":8,"calories":3870,"ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts"]},
    "rc_feline_senior":{"protein":28,"fat":12,"fiber":5.0,"moisture":8,"calories":3720,"ingredients":["dehydrated poultry protein","rice","maize","vegetable protein isolate","animal fats","maize gluten","vegetable fibres","beet pulp","fish oil","minerals","soya oil","yeasts","glucosamine"]},
    "rc_feline_sterilised":{"protein":37,"fat":12,"fiber":6.2,"moisture":8,"calories":3500,"ingredients":["dehydrated poultry protein","maize","wheat","vegetable protein isolate","vegetable fibres","animal fats","maize gluten","beet pulp","fish oil","minerals","psyllium","fructo-oligo-saccharides"]},
    "rc_canine_puppy":{"protein":32,"fat":20,"fiber":2.5,"moisture":9.5,"calories":3980,"ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts","fructo-oligo-saccharides"]},
    "rc_canine_adult":{"protein":25,"fat":14,"fiber":3.8,"moisture":9.5,"calories":3780,"ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts"]},
    "rc_canine_senior":{"protein":23,"fat":14,"fiber":4.0,"moisture":9.5,"calories":3650,"ingredients":["dehydrated poultry protein","maize","wheat","animal fats","maize gluten","beet pulp","vegetable protein isolate","fish oil","minerals","soya oil","yeasts","glucosamine","chondroitin"]},
    "hills_feline_kitten":{"protein":38,"fat":22,"fiber":3.0,"moisture":8,"calories":4035,"ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","cracked pearled barley","dried beet pulp","chicken liver flavour","fish oil","soybean oil","lactic acid","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_feline_adult":{"protein":34,"fat":20,"fiber":3.5,"moisture":8,"calories":3955,"ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","chicken liver flavour","fish oil","soybean oil","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_feline_senior":{"protein":31,"fat":18,"fiber":4.0,"moisture":8,"calories":3820,"ingredients":["chicken","brown rice","wheat gluten","chicken fat","whole grain wheat","corn gluten meal","dried beet pulp","fish oil","soybean oil","calcium carbonate","potassium chloride","vitamins","minerals","taurine"]},
    "hills_canine_puppy":{"protein":28,"fat":17,"fiber":2.5,"moisture":10,"calories":3845,"ingredients":["chicken meal","whole grain wheat","cracked pearled barley","whole grain sorghum","whole grain corn","chicken fat","corn gluten meal","chicken liver flavour","dried beet pulp","soybean oil","fish oil","vitamins","minerals"]},
    "hills_canine_adult":{"protein":25,"fat":15,"fiber":3.0,"moisture":10,"calories":3725,"ingredients":["chicken meal","whole grain wheat","cracked pearled barley","whole grain sorghum","whole grain corn","chicken fat","corn gluten meal","chicken liver flavour","dried beet pulp","soybean oil","flaxseed","vitamins","minerals"]},
    "advance_feline_adult":{"protein":36,"fat":16,"fiber":3.0,"moisture":10,"calories":3750,"ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","natural flavour","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals","taurine"]},
    "advance_canine_puppy":{"protein":30,"fat":18,"fiber":2.5,"moisture":10.5,"calories":3850,"ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals","natural antioxidants"]},
    "advance_canine_adult":{"protein":26,"fat":14,"fiber":3.0,"moisture":10.5,"calories":3650,"ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","potassium chloride","salt","vitamins","minerals"]},
    "advance_canine_senior":{"protein":22,"fat":12,"fiber":4.0,"moisture":10.5,"calories":3400,"ingredients":["chicken meal","rice","maize gluten","chicken fat","sorghum","dried beet pulp","fish oil","sunflower oil","glucosamine","chondroitin","potassium chloride","salt","vitamins","minerals"]},
    "bh_feline_adult":{"protein":32,"fat":14,"fiber":5.0,"moisture":10,"calories":3600,"ingredients":["chicken meal","rice","maize","chicken fat","vegetable protein","beet pulp","natural flavour","fish oil","sunflower oil","chickpeas","yucca schidigera extract","rosemary extract","vitamins","minerals","taurine"]},
    "bh_canine_adult":{"protein":24,"fat":14,"fiber":4.0,"moisture":10,"calories":3550,"ingredients":["lamb meal","rice","maize","chicken fat","vegetable protein","beet pulp","natural flavour","fish oil","sunflower oil","chickpeas","yucca schidigera extract","rosemary extract","glucosamine","chondroitin","vitamins","minerals"]},
    "ziwi_feline_adult":{"protein":44,"fat":24,"fiber":2.0,"moisture":14,"calories":4800,"ingredients":["mackerel","lamb","lamb heart","lamb tripe","lamb liver","lamb lung","new zealand green mussel","lamb kidney","lamb bone","lecithin","inulin","dried kelp","vitamins","minerals","salt","taurine"]},
    "ziwi_canine_adult":{"protein":38,"fat":28,"fiber":3.0,"moisture":14,"calories":5200,"ingredients":["lamb","lamb heart","lamb tripe","lamb liver","lamb kidney","lamb lung","new zealand green mussel","lamb bone","lecithin","inulin","dried kelp","vitamins","minerals","salt"]},
}

def verify_product(pkey):
    seed = SEED_DATA[pkey]
    mfr = MANUFACTURER_DATA.get(pkey, {})
    retailers = RETAILER_DATA.get(pkey, [])
    meta = PRODUCT_META[pkey]
    mfr_brand = mfr.get("brand","")

    # Build retailer nutrient lookups
    r_nutrients = {f:[] for f in ["protein","fat","fiber","moisture","calories"]}
    r_ingredients = []
    for r in retailers:
        for f in r_nutrients:
            r_nutrients[f].append({"source":r["retailer_name"],"value":r[f]})
        r_ingredients.append({"source":r["retailer_name"],"ingredients":r.get("ingredients",[])})

    conflicts = []
    fields = {}
    units = {"protein":"%","fat":"%","fiber":"%","moisture":"%","calories":"kcal/kg"}

    for fn in ["protein","fat","fiber","moisture","calories"]:
        mfr_v = mfr.get(fn,0) if mfr else 0
        f_obj, c = verify_numeric_field(fn, seed[fn], mfr_v, r_nutrients[fn], units[fn])
        fields[fn] = f_obj
        if c: conflicts.append(c)

    mfr_ing = mfr.get("ingredients",[]) if mfr else []
    ing_obj, ing_conflicts = verify_ingredients(seed["ingredients"], mfr_ing, r_ingredients)
    fields["ingredients"] = ing_obj
    conflicts.extend(ing_conflicts)

    num_fields = [fields[f] for f in ["protein","fat","fiber","moisture","calories"]]
    avg_conf = (sum(f["confidence"] for f in num_fields) + ing_obj["overlap_percentage"]/100) / 6

    total_srcs = len(set(sv["source_name"] for f in num_fields for sv in f["source_values"]))

    if len(conflicts) == 0 and all(f["status"]=="verified" for f in num_fields):
        v_status = "verified"
    elif any(c["severity"]=="HIGH" for c in conflicts):
        v_status = "conflict"
    else:
        v_status = "partial"

    avg_s = sum(f["sources"] for f in num_fields) / 5
    if avg_conf >= 0.90 and avg_s >= 3:
        tier = "GOLD"
    elif avg_conf >= 0.75 and avg_s >= 2:
        tier = "SILVER"
    elif avg_conf >= 0.50:
        tier = "BRONZE"
    else:
        tier = "UNVERIFIED"

    return {
        "product_id":pkey,
        "brand":mfr_brand,
        "product_name":meta["product_name"],
        "species":meta["species"],
        "verified_at":"2026-06-13T10:00:00Z",
        "fields":fields,
        "overall_confidence":round(avg_conf,3),
        "total_sources":total_srcs,
        "verification_status":v_status,
        "conflicts":conflicts,
        "tier":tier,
    }

def build_summary(profiles):
    t = len(profiles)
    fc = {f:sum(1 for p in profiles if p["fields"][f]["status"]!="unverified") for f in ["protein","fat","fiber","moisture","calories","ingredients"]}
    return {
        "total_products":t,
        "verified":sum(1 for p in profiles if p["verification_status"]=="verified"),
        "partial":sum(1 for p in profiles if p["verification_status"]=="partial"),
        "conflict":sum(1 for p in profiles if p["verification_status"]=="conflict"),
        "unverified":sum(1 for p in profiles if p["verification_status"]=="unverified"),
        "field_coverage":fc,
        "tier_distribution":{"GOLD":sum(1 for p in profiles if p["tier"]=="GOLD"),"SILVER":sum(1 for p in profiles if p["tier"]=="SILVER"),"BRONZE":sum(1 for p in profiles if p["tier"]=="BRONZE"),"UNVERIFIED":sum(1 for p in profiles if p["tier"]=="UNVERIFIED")},
        "average_overall_confidence":round(sum(p["overall_confidence"] for p in profiles)/t,3) if t else 0,
        "total_conflicts":sum(len(p["conflicts"]) for p in profiles),
    }

profiles = [verify_product(pk) for pk in sorted(SEED_DATA.keys())]
summary = build_summary(profiles)

os.makedirs(os.path.join(os.path.dirname(__file__),"../../../data"), exist_ok=True)
base = os.path.join(os.path.dirname(__file__),"../../../data")
with open(os.path.join(base,"verified_product_profiles.json"),"w") as f:
    json.dump(profiles,f,indent=2)
with open(os.path.join(base,"verification_summary.json"),"w") as f:
    json.dump(summary,f,indent=2)

print("=== VERIFICATION SUMMARY ===")
print(f"Total Products:        {summary['total_products']}")
print(f"Verified:              {summary['verified']}")
print(f"Partial:               {summary['partial']}")
print(f"Conflict:              {summary['conflict']}")
print(f"Average Confidence:     {summary['average_overall_confidence']}")
print(f"Total Conflicts:        {summary['total_conflicts']}")
print()
print("Tier Distribution:")
for k,v in summary["tier_distribution"].items():
    print(f"  {k}: {v}")
print()
print("Field Coverage:")
for k,v in summary["field_coverage"].items():
    print(f"  {k}: {v}/{summary['total_products']}")
print()
print("By Product (confidence):")
for p in profiles:
    flags = " ⚠️"+str(len(p["conflicts"]))+" conflicts" if p["conflicts"] else ""
    print(f"  {p['product_id']:30s} {p['tier']:5s}  {p['verification_status']:12s}  {p['overall_confidence']:.3f}{flags}")
