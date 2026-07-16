# State-Level API & Data Source Research

## NEW YORK (NY)

### 1. Transportation / Road Conditions
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| 511NY REST API (all feeds) | https://511ny.org/api/v2/get/ | JSON | Requires key (free, register at 511ny.org/developers) | **Confirmed** |
| 511NY Docs | http://511ny.org/developers/doc | HTML | Public | **Confirmed** |
| 511NY Resources (endpoints list) | http://511ny.org/developers/resources | HTML | Public | **Confirmed** |
| 511NY WZDx feed | https://511ny.org/api/v2/get/wzdx | JSON | Requires key | **Confirmed** (endpoint listed in dev resources) |
| 511NY Winter Roads | https://511ny.org/api/v2/get/winterRoads | JSON | Requires key | **Confirmed** |
| 511NY Alerts | https://511ny.org/api/v2/get/alerts | JSON | Requires key | **Confirmed** |
| 511NY Cameras | https://511ny.org/api/v2/get/cameras | JSON | Requires key | **Confirmed** |
| 511NY Message Signs | https://511ny.org/api/v2/get/messageSigns | JSON | Requires key | **Confirmed** |
| 511NY Events | https://511ny.org/api/v2/get/events | JSON | Requires key | **Confirmed** |
| 511NY Truck Parking | https://511ny.org/api/v2/get/truckParking | JSON | Requires key | **Confirmed** |
| NYSDOT Open Data (ArcGIS) | https://gis-nydot.opendata.arcgis.com/ | GeoJSON/ArcGIS | Public | **High** |

### 2. Wildfire / Fire Danger
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYSDEC Fire Danger Map | https://dec.ny.gov/environmental-protection/wildfires/fire-danger-map | HTML/Map | Public | **Confirmed** |
| NYS Mesonet Fire Weather | https://nysmesonet.org/weather/firewx | HTML/JSON | Public | **Confirmed** |
| NYSDEC Wildfires Info | https://dec.ny.gov/environmental-protection/wildfires | HTML | Public | **Confirmed** |
| Open NY Wildfire Data | https://data.ny.gov/Energy-Environment?category=Wildfire | CSV/JSON | Public | **Medium** |

### 3. Water
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYSDEC Water Monitoring Portal | https://dec.ny.gov/environmental-protection/water/water-quality/monitoring/water-quality-data | HTML/Map | Public | **Confirmed** |
| NYSDEC ArcGIS REST Services | https://gisservices.dec.ny.gov/arcgis/rest/services/ | ArcGIS/JSON/GeoJSON | Public | **Confirmed** |
| NYS Hydrography (ArcGIS) | https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Hydrography/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| Great Lakes Water Levels (NOAA GLERL) | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| Great Lakes Water Level Dashboard | https://www.glerl.noaa.gov/data/wlevels/dashboard/ | HTML/JSON | Public | **Confirmed** |
| NOAA CO-OPS Water Level API | https://api.tidesandcurrents.noaa.gov/dpapi/prod/ | JSON/XML | Public | **Confirmed** |
| Great Lakes Daily Water Levels (USACE) | https://water.usace.army.mil/office/lre/reports/GreatLakesDWL | HTML/CSV | Public | **Confirmed** |
| USGS WaterData API (NY) | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |
| NYSDEC Harmful Algal Blooms (HABs) | https://dec.ny.gov/environmental-protection/water/water-quality/harmful-algal-blooms/notifications | HTML | Public | **Confirmed** |
| NYSDEC HABs Program Guide | https://extapps.dec.ny.gov/docs/water_pdf/habsprogramguide.pdf | PDF | Public | **Confirmed** |

### 4. Grid / Energy
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYISO Real-Time Dashboard | https://www.nyiso.com/real-time-dashboard | HTML/JSON | Public | **Confirmed** |
| NYISO Market Data (CSV dumps) | http://mis.nyiso.com/public/ | CSV | Public | **Confirmed** |
| NYISO Energy Market Data | https://www.nyiso.com/energy-market-operational-data | HTML/CSV | Public | **Confirmed** |
| NYISO Fuel Mix (real-time) | http://mis.nyiso.com/public/csv/rtfuelmix/ | CSV | Public | **Confirmed** |
| NYISO Actual Load (5-min) | http://mis.nyiso.com/public/csv/realtime/ | CSV | Public | **Confirmed** |
| NYISO Gen Maintenance Outages | http://mis.nyiso.com/public/csv/genmaint/ | CSV | Public | **Confirmed** |
| Con Edison Outage Map | https://outagemap.coned.com/ | HTML | Public | **Confirmed** |
| National Grid NY Outage Map | https://outagemap.ny.nationalgridus.com/ | HTML | Public | **Confirmed** |
| NYSEG Outage Map | https://www.nyseg.com/outages | HTML | Public | **Confirmed** |

### 5. Environmental Health
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYSDEC Air Quality Monitoring | https://dec.ny.gov/environmental-protection/air-quality/monitoring | HTML | Public | **Confirmed** |
| NYSDEC AQI Page | https://dec.ny.gov/environmental-protection/air-quality/air-quality-index | HTML | Public | **Confirmed** |
| US EPA AQS API (all states) | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key (free) | **Confirmed** |
| US EPA AirNow API (real-time AQI) | https://docs.airnowapi.org/ | JSON/XML | Requires key (free) | **Confirmed** |
| EPA BEACON 2.0 (beach closures) | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML/JSON | Public | **Confirmed** |
| Open NY Air Monitoring Stations | https://data.ny.gov/Energy-Environment/Air-Monitoring-Station-Locations-Attributes/qcpj-zdb6 | CSV/JSON | Public | **Confirmed** |

### 6. Evacuation / Emergency
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYC Hurricane Evacuation Zones | https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/NYC_Hurricane_Evacuation_Zone/FeatureServer/0 | ArcGIS/GeoJSON | Public | **Confirmed** |
| NYC Hurricane Evacuation Map | https://maps.nyc.gov/hurricane/ | HTML | Public | **Confirmed** |
| NYC Open Data Evacuation Zones | https://data.cityofnewyork.us/Public-Safety/Hurricane-Evacuation-Zones/xgrq-ed8m | CSV/GeoJSON | Public | **Confirmed** |
| NY DHSES Emergency Resources | https://www.dhses.ny.gov/ | HTML | Public | **High** |

### 7. Weather
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NYS Mesonet Standard Network | https://www.nysmesonet.org/ | CSV/netCDF | Requires registration | **Confirmed** |
| NYS Mesonet Data Request | https://www.nysmesonet.org/weather/requestdata | HTML | Requires registration | **Confirmed** |
| NYS Mesonet API (HRECOS) | https://nysm.hrecos.org/ | JSON | Public/research | **Confirmed** |

---

## PENNSYLVANIA (PA)

### 1. Transportation / Road Conditions
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| PennDOT RCRS Event Data API | https://www.pa.gov/agencies/penndot/programs-and-doing-business/online-services/developer-resources-documentation-api | JSON | Requires key (free, register at pa.gov) | **Confirmed** |
| RCRS liveEvents | RCRS API method (docs above) | JSON | Requires key | **Confirmed** |
| RCRS plannedEvents | RCRS API method | JSON | Requires key | **Confirmed** |
| RCRS winterConditions | RCRS API method | JSON | Requires key | **Confirmed** |
| PennDOT Data Feed Request | https://www.pa.gov/services/penndot/request-access-to-transportation-related-data-feeds | HTML | Registration required | **Confirmed** |
| PennDOT GIS Open Data | https://gis.penndot.gov/ | ArcGIS | Public | **High** |
| PA Turnpike TRIP XML Feeds | Via RCRS/511PA system | XML | Requires key | **Medium** |
| 511PA Website (public view) | https://www.511pa.com/ | HTML | Public | **Confirmed** |

### 2. Wildfire / Fire Danger
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| PA DCNR Wildfire Page | https://www.pa.gov/agencies/dcnr/programs-and-services/community-outreach-and-development/wildfire | HTML/PDF | Public | **Confirmed** |
| PA DCNR Wildfire Priority Areas (ArcGIS) | https://gis.dcnr.pa.gov/agsprod/rest/services/BOF/Priority_Areas_Wildland_Fire_2020/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| PA DCNR Bureau of Forestry ArcGIS | https://gis.dcnr.pa.gov/agsprod/rest/services/BOF/ | ArcGIS | Public | **Confirmed** |
| PA DCNR Fire Danger PDF Maps | https://www.pa.gov/agencies/dcnr/programs-and-services/community-outreach-and-development/wildfire | PDF | Public | **Confirmed** |

### 3. Water
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| USGS PA Water Data | https://waterdata.usgs.gov/pa/nwis/current? | HTML/rdb | Public | **Confirmed** |
| USGS PA Water Science Center | https://www.usgs.gov/centers/pennsylvania-water-science-center/data | HTML/CSV | Public | **Confirmed** |
| USGS PA Groundwater Watch | https://www.usgs.gov/centers/pennsylvania-water-science-center/data | HTML | Public | **Confirmed** |
| USGS WaterData API (PA) | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |
| NOAA Great Lakes Water Levels | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| PA PASDA (Spatial Data Access) | https://www.pasda.psu.edu/ | ArcGIS/GeoJSON | Public | **Confirmed** |

### 4. Grid / Energy
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| PJM Data Miner | https://dataminer.pjm.com | CSV | Requires free API key | **Confirmed** |
| PJM Data Viewer (real-time) | https://dataviewer.pjm.com/dataviewer/pages/public/ | HTML/JSON | Public | **Confirmed** |
| PJM Data Directory | https://www.pjm.com/markets-and-operations/data-dictionary | HTML | Public | **Confirmed** |
| PJM Data Miner API Guide | https://www.pjm.com/-/media/etools/data-miner-2/data-miner-2-api-guide.ashx | PDF | Public | **Confirmed** |
| PJM Open Data (ArcGIS) | https://pjm.maps.arcgis.com/ | ArcGIS | Public | **High** |

### 5. Environmental Health
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| US EPA AQS API (PA data) | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key | **Confirmed** |
| EPA BEACON 2.0 (beach closures) | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML | Public | **Confirmed** |
| PA DEP Air Quality | https://www.dep.pa.gov/ | HTML | Public | **High** |

### 6. Evacuation / Emergency
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| PEMA GIS / PASDA | https://www.pasda.psu.edu/uci/SearchResults.aspx?originator=Pennsylvania+Emergency+Management+Agency | Shapefile/GeoJSON | Public | **Confirmed** |
| PA NG911 GIS Requirements | https://www.pa.gov/agencies/pema/911-program/gis | HTML | Public | **Confirmed** |
| York County PA Emergency Mgmt ArcGIS | https://maps.yorkcounty.gov/arcgis/rest/services/AGOservices/Emergency_Management_Service/FeatureServer | ArcGIS/JSON | Public | **Confirmed** |

### 7. Weather
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| Penn State Weather (no dedicated mesonet) | https://www.weather.psu.edu/ | HTML | Public | **Medium** |
| NOAA NWS PA | https://www.weather.gov/ctp/ | HTML/XML | Public | **Confirmed** |

---

## MICHIGAN (MI)

### 1. Transportation / Road Conditions
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MDOT ITS Data | https://www.michigan.gov/mdot/travel/safety/efforts/its/its-data | HTML | Public | **Confirmed** |
| Michigan GIS Open Data (MDOT) | https://gis-mdot.opendata.arcgis.com/ | GeoJSON/ArcGIS | Public | **Confirmed** |
| Michigan Open Data Portal | https://michigan.data.socrata.com/ | CSV/JSON | Public | **Confirmed** |
| Mi Drive (public map) | https://www.michigan.gov/drive | HTML | Public | **Confirmed** |

### 2. Wildfire / Fire Danger
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MI DNR Fire Danger (ArcGIS REST) | https://www.mcgi.state.mi.us/maps/rest/services/DNR/Wildfire/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| MI DNR Fire Alert | https://www.michigan.gov/dnr/firealert | HTML | Public | **Confirmed** |
| MI DNR Burn Permits Map | https://www.dnr.state.mi.us/burnpermits/ | HTML | Public | **Confirmed** |
| MI Wildfire & Prescribed Fire (2025) | https://gis-midnr.opendata.arcgis.com/datasets/352ed2b1c7464dcaa6987c256ef0afc8_0 | GeoJSON/ArcGIS | Public | **Confirmed** |
| Great Lakes Fire & Fuels (MesoWest) | https://glff.mesowest.org/map/ | HTML/JSON | Public | **Confirmed** |

### 3. Water
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MI EGLE Hydrologic Data | https://www.michigan.gov/egle/about/organization/water-resources/hydrologic-data | HTML | Public | **Confirmed** |
| MI EGLE Open Data (ArcGIS Hub) | https://gis-egle.hub.arcgis.com/ | ArcGIS/GeoJSON | Public | **Confirmed** |
| MI EGLE WRD Open Data (ArcGIS REST) | https://gisagoegle.state.mi.us/arcgis/rest/services/EGLE/WrdOpenData/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| MI EGLE MiEnviro (ArcGIS REST) | https://gisagoegle.state.mi.us/arcgis/rest/services/EGLE/MiEnviro/FeatureServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| MI Beach/River E. Coli (ArcGIS) | https://www.mcgi.state.mi.us/arcgis/rest/services/DEQ/MiSWIMS/MapServer/10 | ArcGIS/GeoJSON | Public | **Confirmed** |
| MI EGLE BeachGuard | https://www.michigan.gov/egle/about/organization/water-resources/beaches | HTML | Public | **Confirmed** |
| MI EGLE BeachGuard (MiEnviro) | https://mienviro.michigan.gov/ | HTML | Public | **Confirmed** |
| NOAA Great Lakes Water Levels | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| USACE Great Lakes Daily Levels | https://water.usace.army.mil/office/lre/reports/GreatLakesDWL | HTML/CSV | Public | **Confirmed** |
| USGS WaterData API (MI) | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |

### 4. Grid / Energy
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MISO RT Data APIs | https://www.misoenergy.org/markets-and-operations/rtdataapis/ | JSON | Public | **Confirmed** |
| MISO Public DataBroker | https://api.misoenergy.org/MISORTWDDataBroker/ | JSON | Public | **Confirmed** |
| MISO Operations Displays | https://www.misoenergy.org/markets-and-operations/real-time--market-data/operations-displays/ | HTML | Public | **Confirmed** |
| MISO Markets Displays | https://www.misoenergy.org/markets-and-operations/real-time--market-data/markets-displays/ | HTML | Public | **Confirmed** |
| MISO Emissions Dashboard | https://miso.singularity.energy/realtime | HTML | Public | **Confirmed** |
| PJM Data Miner (MI in PJM footprint) | https://dataminer.pjm.com | CSV | Requires free key | **High** (parts of MI in PJM) |

### 5. Environmental Health
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MI EGLE BeachGuard (beach closures) | https://www.michigan.gov/egle/about/organization/water-resources/beaches | HTML | Public | **Confirmed** |
| MI EGLE Beach Monitoring Map | https://mienviro.michigan.gov/ | HTML | Public | **Confirmed** |
| US EPA AQS API (MI data) | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key | **Confirmed** |
| EPA BEACON 2.0 | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML | Public | **Confirmed** |

### 6. Evacuation / Emergency
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MI MSP EMHSD Online Tools | https://www.michigan.gov/msp/divisions/emhsd/programs-and-publications/online-tools | HTML | Public | **Confirmed** |
| MI EMHSD Risk Dashboard (ArcGIS) | https://emhsd.maps.arcgis.com/apps/dashboards/273f0ae54a3742339fca7a5e77726e74 | HTML | Public | **Confirmed** |
| MI NG911 GIS Repository | https://www.michigan.gov/dtmb/services/maps/michigan-statewide-ng911-gis-repository | HTML | Public | **Confirmed** |
| MI MPSCS ArcGIS (emergency) | https://gisp.mcgi.state.mi.us/arcgis/rest/services/MPSCS/mpscs/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |

### 7. Weather
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MI State Climatologist Office | https://www.michigan.gov/climate | HTML | Public | **High** |
| NOAA NWS MI | https://www.weather.gov/dtx/ | HTML/XML | Public | **Confirmed** |

---

## MINNESOTA (MN)

### 1. Transportation / Road Conditions
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MnDOT 511 API (Castle Rock) | https://www.castlerockits.com/xml-data-feeds | XML | Public | **Confirmed** |
| MnDOT 511 Events API | http://hb.511mn.org/tgevents/api/eventReports?maxPriority=3 | JSON | Public | **Confirmed** |
| MnDOT Traffic Data (ArcGIS) | https://dotapp9.dot.state.mn.us/egis12/rest/services/TFA/MNDOT_TRAFFIC_DATA/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| MnDOT 511 Public Map | https://511mn.org/ | HTML | Public | **Confirmed** |

### 2. Wildfire / Fire Danger
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MN DNR Fire Danger | https://www.dnr.state.mn.us/forestry/fire/firerating_restrictions.html | HTML/Map | Public | **Confirmed** |
| MN DNR Wildland Fire Info | https://www.dnr.state.mn.us/forestry/fire/wildfirereports_tools.html | HTML | Public | **Confirmed** |
| MN DNR Wildfires Tracked (GeoCommons) | https://gisdata.mn.gov/en/dataset/env-wildfires-tracked-by-mndnr | GeoJSON/Shapefile | Public | **Confirmed** |
| MN DNR Services API | https://services.dnr.state.mn.us/ | JSON | Public | **Confirmed** |

### 3. Water
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MN DNR River Levels | https://www.dnr.state.mn.us/river_levels/index.html | HTML | Public | **Confirmed** |
| MN DNR Lake Level MN Monitoring | https://www.dnr.state.mn.us/waters/surfacewater_section/lake_hydro/index.html | HTML/CSV | Public | **Confirmed** |
| MN DNR LakeFinder API | http://services.dnr.state.mn.us/api/lakefinder/by_point/v1/ | JSON | Public | **Confirmed** |
| MN DNR Where API | http://services.dnr.state.mn.us/api/where/v2 | JSON | Public | **Confirmed** |
| MN PCA Surface Water API | https://services.pca.state.mn.us/surfacewater | JSON | Public | **Confirmed** |
| USGS WaterData API (MN) | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |
| NOAA Great Lakes Water Levels | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| MN DNR Snow Depth Maps | https://www.dnr.state.mn.us/climate/snowmap/index.html | HTML | Public | **Confirmed** |

### 4. Grid / Energy
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MISO RT Data APIs | https://www.misoenergy.org/markets-and-operations/rtdataapis/ | JSON | Public | **Confirmed** |
| MISO Public DataBroker | https://api.misoenergy.org/MISORTWDDataBroker/ | JSON | Public | **Confirmed** |
| MISO Operations Displays | https://www.misoenergy.org/markets-and-operations/real-time--market-data/operations-displays/ | HTML | Public | **Confirmed** |
| MISO Emissions Dashboard | https://miso.singularity.energy/realtime | HTML | Public | **Confirmed** |

### 5. Environmental Health
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MN PCA Air Quality Index | https://datareports.pca.state.mn.us/node/782 | HTML | Public | **Confirmed** |
| MN PCA Air Quality Data | https://data.pca.state.mn.us/ | HTML/CSV | Public | **Confirmed** |
| MN Public Health Air Quality | https://data.web.health.state.mn.us/air_aqi | HTML/CSV | Public | **Confirmed** |
| MN PCA Air Quality Monitoring | https://www.pca.state.mn.us/air-water-land-climate/air-quality-monitoring | HTML | Public | **Confirmed** |
| US EPA AQS API (MN data) | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key | **Confirmed** |
| EPA BEACON 2.0 | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML | Public | **Confirmed** |

### 6. Evacuation / Emergency
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MN MESB Emergency Service Zones (ArcGIS) | https://arcgis.metc.state.mn.us/arcgis/rest/services/MetroGIS/MESB_PSAP_ESZ/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| MN E911 Districts (ArcGIS) | https://arcgis.metc.state.mn.us/arcgis/rest/services/MetroGIS/E911Districts_V1_1/FeatureServer/14 | ArcGIS/GeoJSON | Public | **Confirmed** |
| MN Emergency Service Zones (GeoCommons) | https://gisdata.mn.gov/dataset/org-mn-mesb-bdry-esz | Shapefile/GeoJSON | Public | **Confirmed** |
| MN Geo (state GIS clearinghouse) | https://www.mngeo.state.mn.us/ | HTML | Public | **Confirmed** |

### 7. Weather
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| MN DNR Climate Office | https://www.dnr.state.mn.us/climate/climate_monitor/maps.html | HTML | Public | **Confirmed** |
| MN DNR Snow Depth Ranking | https://www.dnr.state.mn.us/climate/snowmap/index.html | HTML | Public | **Confirmed** |
| UMN Snow Water Equivalent | https://snowcontroltools.umn.edu/research/climatology/snow-water-equivalent | HTML | Public | **High** |

---

## ILLINOIS (IL)

### 1. Transportation / Road Conditions
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| IDOT GIS Open Data (ArcGIS) | https://gis-idot.opendata.arcgis.com/ | GeoJSON/ArcGIS/CSV | Public | **Confirmed** |
| IDOT Getting Around Illinois | https://www.gettingaroundillinois.com/ | HTML/JSON | Public | **Confirmed** |
| IDOT Getting Around Illinois - Map Viewer | https://www.gettingaroundillinois.com/MapViewer/?config=RFCconfig.json | HTML/JSON | Public | **Confirmed** |
| IDOT Travel Midwest (GTIS) | https://www.travelmidwest.com/ | HTML/XML | Public | **Confirmed** |
| IDOT Travel Midwest Gateway XML | https://www.travelmidwest.com/ | XML | Public | **High** |

### 2. Wildfire / Fire Danger
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| IL Interagency Coordination Center | https://gacc.nifc.gov/eacc/dispatch_centers/ILC/predictive-services.php | HTML | Public | **Confirmed** |
| IL DNR ArcGIS REST Services | https://geoservices3.dnr.illinois.gov/arcgis/rest/services | ArcGIS/GeoJSON | Public | **Confirmed** |
| Shawnee NF Prescribed Fire Map | https://www.fs.usda.gov/r09/shawnee/fire | HTML | Public | **Confirmed** |
| Illinois Prescribed Fire Council Map | https://www.illinoisprescribedfirecouncil.org/map-instructions.html | HTML | Public | **Confirmed** |
| NWS Fire Weather IL | https://www.weather.gov/ilx/fire | HTML | Public | **Confirmed** |

### 3. Water
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| IL DNR Water Resources ArcGIS | https://maps.dnr.illinois.gov/geoservices/rest/services/WaterResources/ | ArcGIS/GeoJSON | Public | **Confirmed** |
| IL River Stage Inundation | https://maps.dnr.illinois.gov/geoservices/rest/services/WaterResources/IllinoisRiverStageInundationLayers/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| IL DesPlaines River Inundation | https://maps.dnr.illinois.gov/geoservices/rest/services/WaterResources/DesplainesRiverStageInundationLayers/MapServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| IL River Inundation Viewer | https://maps.dnr.illinois.gov/INUND/inund.html | HTML | Public | **Confirmed** |
| IL DNR Base Layers (USGS Gauges) | https://maps.dnr.illinois.gov/geoservices/rest/services/BaseLayers/MapServer/1 | ArcGIS | Public | **Confirmed** |
| IL DNR Lake Depth & Capacity | https://maps.dnr.illinois.gov/geoservices/rest/services/WaterResources/LakeDepthAndCapacity/MapServer | ArcGIS | Public | **Confirmed** |
| USGS WaterData API (IL) | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |
| NOAA Great Lakes Water Levels | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| IL EPA Water Quality Monitoring | https://epa.illinois.gov/topics/water-quality/monitoring.html | HTML | Public | **Confirmed** |

### 4. Grid / Energy
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| PJM Data Miner (IL in PJM) | https://dataminer.pjm.com | CSV | Requires free key | **Confirmed** |
| PJM Data Viewer (real-time) | https://dataviewer.pjm.com/dataviewer/pages/public/ | HTML/JSON | Public | **Confirmed** |
| MISO RT Data APIs (parts of IL) | https://www.misoenergy.org/markets-and-operations/rtdataapis/ | JSON | Public | **Confirmed** |
| MISO Public DataBroker | https://api.misoenergy.org/MISORTWDDataBroker/ | JSON | Public | **Confirmed** |
| CUSEC Power Outage Dashboard | https://www.arcgis.com/apps/opsdashboard/index.html#/9d22b97ce1ee4255b63c11f442b87e7d | HTML | Public | **Confirmed** |

### 5. Environmental Health
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| IL EPA Air Monitoring | https://epa.illinois.gov/topics/air-quality/outdoor-air/air-monitoring.html | HTML | Public | **Confirmed** |
| US EPA AQS API (IL data) | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key | **Confirmed** |
| EPA BEACON 2.0 | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML | Public | **Confirmed** |
| IL BeachGuard | http://www.idph.state.il.us/envhealth/ilbeaches/public/ | HTML | Public | **Confirmed** |
| IL EPA Water Quality | https://epa.illinois.gov/topics/water-quality/monitoring.html | HTML | Public | **Confirmed** |

### 6. Evacuation / Emergency
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| IL IEMA-OHS | https://iemaohs.illinois.gov/ | HTML | Public | **Confirmed** |
| IL Emergency Operations Plan | https://iemaohs.illinois.gov/preparedness/ieop.html | HTML/PDF | Public | **Confirmed** |
| IL IEMA GIS Resources | https://clearinghouse.isgs.illinois.edu/resources/emergency | HTML | Public | **Confirmed** |
| IL EPA IEMA WTP/WWT ArcGIS | http://geoservices.epa.illinois.gov/arcgis/rest/services/OER/MajorRiverWTPWWTP/FeatureServer | ArcGIS/GeoJSON | Public | **Confirmed** |
| IL GIS Clearinghouse | https://clearinghouse.isgs.illinois.edu/ | HTML/GeoJSON | Public | **Confirmed** |

### 7. Weather
| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| NOAA NWS IL | https://www.weather.gov/lot/ | HTML/XML | Public | **Confirmed** |
| Illinois State Water Survey | https://www.isws.illinois.edu/ | HTML | Public | **High** |
| Prairie Research Institute (weather) | https://www.prairie.illinois.edu/ | HTML | Public | **High** |

---

## CROSS-STATE / FEDERAL SOURCES (applicable to all 5 states)

| Source | URL | Format | Access | Confidence |
|--------|-----|--------|--------|------------|
| **USGS WaterData API (all states)** | https://api.waterdata.usgs.gov/ogcapi/v0/collections/ | GeoJSON | Public | **Confirmed** |
| **USGS Instantaneous Values API** | https://waterservices.usgs.gov/nwis/iv/ | JSON/XML | Public | **Confirmed** |
| **USGS Daily Values API** | https://waterservices.usgs.gov/nwis/dv/ | JSON/XML | Public | **Confirmed** |
| **NOAA CO-OPS Water Levels (Great Lakes)** | https://api.tidesandcurrents.noaa.gov/dpapi/prod/ | JSON/XML | Public | **Confirmed** |
| **NOAA Tides & Currents (Great Lakes stations)** | https://tidesandcurrents.noaa.gov/stationlist.html?type=Great+Lakes | HTML/JSON | Public | **Confirmed** |
| **NOAA Great Lakes GLERL** | https://glerl.noaa.gov/data/wlevels/ | JSON/CSV | Public | **Confirmed** |
| **NOAA NWS API (weather alerts)** | https://api.weather.gov/ | JSON/GeoJSON | Public | **Confirmed** |
| **EPA AQS API** | https://aqs.epa.gov/aqsweb/documents/data_api.html | JSON/CSV | Requires key (free) | **Confirmed** |
| **EPA AirNow API** | https://www.airnowapi.org/ | JSON/XML | Requires key (free) | **Confirmed** |
| **EPA BEACON 2.0 (beach closures)** | https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/ | HTML | Public | **Confirmed** |
| **WZDx Feed Registry** | https://datahub.transportation.gov/d/69qe-yiui | JSON | Public | **Confirmed** |
| **NWS Fire Weather** | https://www.weather.gov/fire | HTML/XML | Public | **Confirmed** |
| **NIFC Wildland Fire (all states)** | https://www.nifc.gov/ | HTML | Public | **Confirmed** |
| **USDA Forest Service Active Fire** | https://www.fs.usda.gov/ | HTML | Public | **Confirmed** |

## KEY NOTES

1. **511NY (NY)**: Best-in-class API. Requires free developer key from http://511ny.org/developers/. Endpoints include cameras, alerts, events, message signs, winter roads, truck parking, WZDx, alternative fuel. Base URL: `https://511ny.org/api/v2/get/`

2. **PennDOT RCRS (PA)**: Requires registration via Data Feed Request Form. Uses HTTP Basic Auth. Methods: `liveEvents`, `plannedEvents`, `winterConditions`. Register at https://www.pa.gov/services/penndot/request-access-to-transportation-related-data-feeds

3. **MISO (MI, MN, parts of IL)**: Real-time data APIs now JSON-only as of Dec 2025. https://www.misoenergy.org/markets-and-operations/rtdataapis/

4. **PJM (PA, IL, parts of MI)**: Data Miner at https://dataminer.pjm.com requires free API key. Data Viewer at https://dataviewer.pjm.com is public.

5. **NYISO (NY)**: CSV files publicly available at http://mis.nyiso.com/public/. No key required. Fuel mix, load, LBMP, etc.

6. **Great Lakes Water Levels**: NOAA GLERL provides comprehensive data for all 5 states via https://glerl.noaa.gov/data/wlevels/

7. **NYS Mesonet (NY)**: Requires registration, data available as CSV/netCDF. https://www.nysmesonet.org/

8. **WZDx Feeds**: NY has WZDx via 511NY API. Other states may not have dedicated WZDx feeds yet. Check WZDx Feed Registry at the USDOT site.
