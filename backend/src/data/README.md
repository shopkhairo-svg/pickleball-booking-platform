# Vietnamese location suggestions

`vietnam-locations.json` is a local search catalogue, not a geocoder or a list of bookable courts. The application never calls a public maps API for autocomplete. Court results still come from MongoDB.

Source: [ThangLeQuoc/vietnamese-provinces-database](https://github.com/ThangLeQuoc/vietnamese-provinces-database), under the [MIT license](./VietnamLocations.LICENSE). Generated from `json/vn_only_simplified_json_generated_data_vn_units.json` at these pinned versions:

- Current provinces and wards: v5.2.0, commit `62b1abdfe39625289c37a58ef6678e9db3d37f84`.
- Legacy district names and former province names: v2.4.1, commit `fc33b7411ec4e3697817fab8118718a8d39ef090`.

The 4,085 entries include 34 current provinces, 3,321 current wards, 696 former districts and 34 former province names not already present in the current list. Legacy entries are explicitly labelled as old addresses in the UI. They support courts whose addresses still use those names; they do not define current administrative boundaries or automatically translate an old district into new wards.

Stable IDs retain the source version, administrative level and source code, e.g. `vn-v1-d-769` (former Thu Duc city) and `vn-v2-p-79` (Ho Chi Minh City). For a new source revision, regenerate this file with the same IDs for unchanged source codes, preserve the source metadata and license, and rerun the location and court search tests. Do not silently repurpose an existing ID for a different place.

District/ward selections match both the place name and its parent province in court `location` / `address`. Ward selections additionally require their administrative qualifier (e.g. `Phường Thủ Đức` or `P. Thủ Đức`) to avoid confusing a current ward with a former city/district or a city alias of the same name. Store complete addresses including province/city when adding courts. Coordinates are separately required for GPS-based nearby search. Free-text addresses cannot reliably infer administrative boundaries, merge histories or geographic proximity.
