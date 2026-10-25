# Intervention Taxonomy — v0.1 (draft for review)

This is the controlled vocabulary for `interventions[].type` in `case_card.json`. The codes in the `### code` headings below must match the `intervention_type` enum in the schema; `schema/validate.py` checks that they do.

## How to classify

1. **One primary type per intervention.** If a project really mixes types, give it one `type` and list the rest in `secondary_types`. Example: Hobbiton is `film_tv_location` (primary) with `branded_ip_theme_park` and `food_wine_agritourism` (the working sheep farm) as secondary types.
2. **An intervention is a deliberate move or a discrete event that someone could, in principle, copy.** Slow background trends (e.g. general rise in air travel) belong in `starting_conditions` or `trigger`, not here.
3. **Some things are facets, not types.** Who led it (`actors[].kind`), whether they were local (`actors[].locality`), how big it was (`scale`) and what it cost (`investment`) are recorded separately. So we don't create "artist-led festival" or "state-funded museum" types. That keeps the list short and lets the analog finder combine facets freely.
4. **Triggers are a separate vocabulary** (`trigger.types`: founder, institution, policy, disaster, media_ip, infrastructure, accident, market_shift, designation, crisis_response, diaspora_or_migration). A trigger is *what set things moving*; an intervention is *what someone did*. A disaster can be a trigger, and the rebuild after it is an intervention.
5. **Mitigations are interventions too.** A short-term-rental ban or a cruise cap gets its own intervention entry. Its `outcome` is judged against its stated goal, and it is linked from the `second_order_effects[].mitigations_tried` it responds to.
6. **When unsure, pick the type that best explains the mechanism** (what made people come, stay, or invest), not the one that sounds best in a press release.

Each entry gives: definition · includes / excludes · mechanism · typical second-order risks · niche-vs-hub tendency (a **hypothesis to test**, not a finding) · illustrative cases.

> **The illustrative cases are not verified.** They are candidates for the Phase 2 seed list, chosen to show what each type means. None of them is a sourced claim yet.

---

## Family A — Attractors (create a reason to visit)

### anchor_institution
**Definition:** A large, permanent, non-IP cultural or educational institution placed to draw visitors and investment: a museum, a performing-arts center, a university campus, a library, or a landmark building by a famous architect.
**Includes:** "Starchitect" museums, branch museums (Louvre Abu Dhabi, Tate St Ives), founder-funded museums, university relocations or expansions used as development strategy.
**Excludes:** Corporate tech campuses (use `industrial_cluster_innovation_district`), branded attractions (use `branded_ip_theme_park` or `immersive_art_experience`).
**Mechanism:** Signal of renewal plus a steady flow of visitors, which pulls in hospitality and real-estate investment around the site.
**Second-order risks:** Displacement near the site; costs that outlast attendance; "Bilbao effect" copies that fail.
**Niche/hub tendency:** Often makes the place a host (franchise branches, outside architects). Can become an originator when local collections or institutions grow on top of it.
**Illustrative:** Bilbao (Guggenheim), North Adams (MASS MoCA), Bentonville (Crystal Bridges), Margate (Turner Contemporary), Tate Modern / Bankside.

### branded_ip_theme_park
**Definition:** An attraction built around intellectual property that is owned and controlled by a company (usually outside the place), at destination scale.
**Includes:** Disney and Universal parks and resorts, LEGOLAND, Dollywood (note that Dollywood is IP from a local native), Harry Potter studio tours.
**Excludes:** Film-location tourism that grows without the IP owner building anything (use `film_tv_location`).
**Mechanism:** The IP generates demand regardless of the place. The place supplies land, access and concessions.
**Second-order risks:** Dependency on one company; capture of local governance (special districts); low-wage job mix; sprawl.
**Niche/hub tendency:** The textbook host. A key research question is whether any host places ever spun up their own originators.
**Illustrative:** Anaheim, Orlando/Reedy Creek, Marne-la-Vallée, Urayasu (Tokyo DL), Lantau (Hong Kong DL), Pigeon Forge.

### immersive_art_experience
**Definition:** A permanent walk-through art or experience venue, ticketed and designed for repeat visits and social sharing, that runs at attraction scale.
**Includes:** Meow Wolf, teamLab, Museum of Ice Cream-type venues, and similar concepts that are rolled out to several cities.
**Excludes:** Traditional museums (use `anchor_institution`) and temporary festivals (use `festival_to_identity`).
**Mechanism:** Novelty plus shareability. Can employ local artists at scale.
**Second-order risks:** Novelty decays; the brand moves to bigger markets; the origin town may lose its distinctiveness when the concept is copied elsewhere.
**Niche/hub tendency:** This type sits right on the originator/hub boundary. A concept can start in one place (originator) and then be exported to others (where those places are hosts). Meow Wolf's origin city and its later cities should be separate cases.
**Illustrative:** Santa Fe (Meow Wolf origin), Las Vegas / Denver / Grapevine (later Meow Wolf sites), Tokyo (teamLab).

### film_tv_location
**Definition:** Visitor demand and place identity that come from appearing in, or hosting production of, film or TV. This is usually unplanned at first and later managed.
**Includes:** Set tourism, location tours, film-commission strategies, production incentives *when the aim is place identity* (if the aim is a production industry, use `industrial_cluster_innovation_district`).
**Mechanism:** Media exposure turns into visits. The image of the place is borrowed from the fiction.
**Second-order risks:** Spikes followed by decay; the fiction displaces the real identity; crowding at specific sites (Dubrovnik).
**Niche/hub tendency:** Usually a host of outside IP. It becomes more ownable when locals control access (for example a farm-owned set).
**Illustrative:** Matamata/Hobbiton, Dubrovnik (Game of Thrones), Albuquerque (Breaking Bad), Savannah, Northern Ireland "Game of Thrones Territory".

### festival_to_identity
**Definition:** A recurring event that grows until it defines what the place is known for.
**Includes:** Arts, music, film and tech festivals; fiestas; carnival.
**Excludes:** One-off mega-events (use `sports_mega_event`).
**Mechanism:** A concentrated yearly pulse of visitors, media coverage and networking, which can give the place a year-round identity.
**Second-order risks:** Peak-load strain; the event gets sold or moved; it gets corporatized; residents flee during the event.
**Niche/hub tendency:** Often an originator. The main risk is being acquired by outside promoters.
**Illustrative:** Edinburgh, Austin (SXSW), Park City (Sundance; the festival is moving to Boulder from 2027, which makes a natural experiment), Glastonbury/Pilton, Pamplona, Telluride.

### heritage_rebrand
**Definition:** Repackaging the real history or built fabric of a place as the main draw. This means restoration, interpretation, historic districts or living-history attractions.
**Includes:** National historical parks for industrial heritage, restored old towns, reconstructions.
**Excludes:** Gaining a formal designation alone (use `designation_listing`).
**Mechanism:** Turns stock that already exists (old buildings, stories) into experiences. Usually little new building.
**Second-order risks:** "Museumification" (the place feels like a museum, not a home); heritage-rule constraints on housing; selective or sanitized narratives.
**Niche/hub tendency:** Origin is local by definition. Authorship may be held by outside foundations or the state.
**Illustrative:** Lowell MA, Colonial Williamsburg, Bath, Lunenburg, Ironbridge Gorge.

### food_wine_agritourism
**Definition:** Making local food, drink or farming the attraction: wine regions, restaurant scenes, food trails, farm stays, appellation branding.
**Mechanism:** Products that cannot be moved (terroir, local cuisine) bring demand to the place, and the products can also be exported under the place's name.
**Second-order risks:** Land prices rise beyond reach of farmers; vineyards get consolidated by outside capital; restaurant scenes gentrify.
**Niche/hub tendency:** Strongly originator-leaning, since geographic indications lock the value to the place. It can turn into a hub when outside conglomerates buy up producers.
**Illustrative:** Napa, San Sebastián, Alba, Margaret River, Hudson Valley farm-to-table, Oaxaca.

### nature_adventure_eco
**Definition:** Making landscape, wildlife or outdoor sport the draw: national parks, trail networks, ski and surf, ecotourism lodges.
**Mechanism:** Natural assets that are rare or easy to get to become recreation demand. Often linked with amenity migration.
**Second-order risks:** Ecological damage; seasonality; housing pressure from gateway towns; climate exposure (snow, reefs).
**Niche/hub tendency:** The asset is local, but ownership of resorts often comes from outside (for example ski-resort conglomerates).
**Illustrative:** Queenstown, Moab, Bentonville (mountain biking), Costa Rica, Interlaken, Maya Bay (cautionary).

### wellness_retreat
**Definition:** The place is positioned around healing, spirituality, self-transformation or health: spas, retreats, yoga and meditation centers, thermal baths.
**Mechanism:** An identity based on a story ("energy", "healing waters"). Visitors pay high spend per head and stay long.
**Second-order risks:** Commodification of local spiritual culture; rising costs of digital-nomad living; cultural friction.
**Niche/hub tendency:** Mixed. The story is often authored by outsiders (books, films, gurus).
**Illustrative:** Ubud, Sedona, Esalen/Big Sur, Baden-Baden, Rishikesh, Ojai.

### sports_mega_event
**Definition:** A one-off or rarely held major event (Olympics, World Cup, Expo, Commonwealth Games), plus the regeneration program built around it.
**Mechanism:** A fixed deadline, a large inflow of capital, global media coverage and infrastructure that is pulled forward in time.
**Second-order risks:** White elephants; debt; evictions; security-state legacies. The ex-post evidence is mostly negative or mixed, which makes this an essential source of cautionary cases.
**Niche/hub tendency:** The host, by definition.
**Illustrative:** Barcelona 1992, Athens 2004, Rio 2016, Sochi 2014, Seville Expo '92, Lillehammer 1994.

### diaspora_pilgrimage
**Definition:** Visitors come because of ancestry, religion or other identity: roots tourism, pilgrimage routes, homecoming campaigns.
**Mechanism:** Emotional and identity ties make demand that holds up through economic swings.
**Second-order risks:** Sacred sites become commodified; crowding at peaks; tension between pilgrims and tourists.
**Niche/hub tendency:** Origin is local and inherent, but the story may be authored by the diaspora.
**Illustrative:** Santiago de Compostela, Ireland (The Gathering 2013), Ghana (Year of Return 2019), Lourdes, Varanasi.

### dark_tourism
**Definition:** Visits to sites of death, disaster, atrocity or danger.
**Mechanism:** Memory, education and curiosity. Often triggered by media.
**Second-order risks:** Ethical controversy; the trauma becomes the identity; descendants and survivors object.
**Niche/hub tendency:** Origin is local and unchosen. Authorship is often contested.
**Illustrative:** Chernobyl/Pripyat, Auschwitz-Birkenau, Hiroshima, Ground Zero NYC, Pompeii.

### gaming_casino
**Definition:** Legalized gambling used as the main development engine.
**Mechanism:** A regulatory monopoly or an early legal advantage, which turns into a destination built around the casinos.
**Second-order risks:** Advantage erodes once nearby jurisdictions legalize gambling; social harms; dependency on one sector.
**Niche/hub tendency:** The rule change is local, but operators and capital mostly come from outside. The result can be the "originator-turned-hub" pattern.
**Illustrative:** Las Vegas, Macau, Atlantic City (cautionary), Deadwood SD, tribal casinos.

### indigenous_led_tourism
**Definition:** Tourism that Indigenous or customary owners plan, own and control. They set the terms of access and of how the story is told.
**Excludes:** Tourism *about* Indigenous culture run by outsiders. Record that under another type, and record the authorship problem in `identity.contested`.
**Mechanism:** Owner control over the asset and the narrative; often tied to land-rights settlements.
**Second-order risks:** Pressure to perform culture on demand; conflict within the community over commercialization.
**Niche/hub tendency:** Built to keep value capture and authorship local, which makes it central to the "what makes an originator" question.
**Illustrative:** Uluru-Kata Tjuta (climb closure 2019), Rotorua / Te Puia, Haida Gwaii, Navajo Tribal Parks (Monument Valley, Antelope Canyon).

## Family B — Talent and production (attract people who make things)

### artist_colonization
**Definition:** Artists, craftspeople or other creatives move into a cheap or overlooked place and redefine it. This is usually unplanned at first.
**Includes:** Art colonies, single-founder art towns, loft districts.
**Mechanism:** Low rents plus distinctive surroundings attract creatives, which builds a scene. The media story that follows then draws tourists and higher-income residents.
**Second-order risks:** The classic gentrification arc, in which the artists are priced out; identity becomes a style that can be imitated.
**Niche/hub tendency:** The founders are usually `in_migrant_resident`, so this is the best test of whether in-migrants count as "local" originators.
**Illustrative:** Taos, Marfa (Judd), Hudson NY, SoHo, Wynwood, Joshua Tree, St Ives (Cornwall).

### industrial_cluster_innovation_district
**Definition:** A place known for an industry concentrated there (tech, film, music, design) whose existence later becomes the place's identity and draws visitors.
**Includes:** Tech campuses, studio clusters, innovation districts, music industry rows.
**Mechanism:** Agglomeration: talent, suppliers and capital gather together, and the place becomes known as a byword for the industry.
**Second-order risks:** Extreme housing costs; the place is exposed to that one industry's cycle; displacement; a monoculture.
**Niche/hub tendency:** The place may have originated the industry, then turned into a hub where outside firms locate. Detroit is the hollowed-hub test case.
**Illustrative:** Silicon Valley, Hollywood, Nashville (Music Row), Detroit, Shenzhen, Kendall Square, Atlanta (film production post-2008 credits).

### amenity_migration_remote_work
**Definition:** Deliberate efforts (or unplanned waves) to attract residents rather than visitors: remote workers, retirees, second-home owners, relocation incentives.
**Mechanism:** People earning outside income spend it locally. Tourism is often the first step: people visit before they move.
**Second-order risks:** Housing affordability crisis; the community splits into old and new; seasonal ghost towns.
**Niche/hub tendency:** Newcomers may found businesses there (compounding) or just consume (hollowing).
**Illustrative:** Tulsa Remote, Bozeman, Ojai, Byron Bay, Madeira digital-nomad village, Italian €1 houses (failure risk).

## Family C — Enablers (access, land, money, rules)

### infrastructure_access
**Definition:** New or improved transport (airport, rail, high-speed rail, highway, bridge, cable car, ferry; cruise terminals use `cruise_port`) that changes who can reach the place and how fast.
**Mechanism:** Shorter travel times greatly widen the market a place can draw from.
**Second-order risks:** The "tunnel effect", where the new link drains activity away to the big city; overtourism after a low-cost-carrier route opens; projects stranded with too little demand.
**Niche/hub tendency:** Neutral on its own. It makes whatever is already there stronger.
**Illustrative:** Medellín (Metrocable), Lille (TGV/Eurostar), Kyoto (shinkansen), Reykjavík/KEF (stopover program), Queenstown airport.

### cruise_port
**Definition:** Developing or expanding a port to receive cruise ships.
**Kept separate from** `infrastructure_access` **because** cruise tourism has its own pattern: short visits concentrated in time, large-volume arrivals, little overnight spend, and recurring local conflict.
**Second-order risks:** Crowding, pollution, low local spend per visitor.
**Niche/hub tendency:** The host, by definition.
**Illustrative:** Venice, Dubrovnik, Santorini, Juneau, Key West, Barcelona.

### special_district_tax_regime
**Definition:** A special legal or fiscal status that creates the conditions for transformation: special districts, free zones, tax-increment financing, tax holidays, governance carve-outs.
**Mechanism:** Lowers costs or grants self-governance in order to attract investors.
**Second-order risks:** Democratic accountability is lost; the incentives become permanent; a race to the bottom between places.
**Niche/hub tendency:** Usually designed to attract outside capital, so the place tends to become a host.
**Illustrative:** Reedy Creek (Orlando), Shenzhen SEZ, Las Vegas (Nevada gaming and tax regime), Dublin IFSC, Puerto Rico Act 20/22.

### waterfront_brownfield_regeneration
**Definition:** Redevelopment of former industrial, port or rail land into mixed-use visitor districts.
**Mechanism:** Prime land that was under-used gets public spending on its public spaces, which draws in private development.
**Second-order risks:** The district can feel the same as everywhere else ("festival marketplace"); luxury housing; public land is privatized.
**Niche/hub tendency:** Usually led by outside developers or the state.
**Illustrative:** Baltimore Inner Harbor, Hamburg HafenCity, Bilbao Abandoibarra, London Docklands, Cape Town V&A Waterfront.

## Family D — Narrative and signal (change how the place is seen)

### designation_listing
**Definition:** An outside body gives the place a formal status that works as a quality signal: UNESCO World Heritage, European Capital of Culture, Dark Sky Place, Michelin stars at scale, "Best Places" rankings, Cittaslow, Blue Zones.
**Mechanism:** Outside validation lowers the risk of choosing the place, so it draws media coverage and visitors. There are often rules attached.
**Second-order risks:** A visitor surge that is not managed (Hallstatt); heritage limits on adapting the place; delisting threats (Venice "in danger").
**Niche/hub tendency:** The asset is local, the label comes from outside.
**Illustrative:** Glasgow 1990 and Liverpool 2008 (Capital of Culture), Hallstatt (UNESCO), Flagstaff (Dark Sky), Hoi An.

### place_branding_campaign
**Definition:** A deliberate destination or city marketing campaign that redefines how the place is seen.
**Mechanism:** Paid and earned media change the place's image.
**Second-order risks:** Promises the reality cannot keep; the brand has no local roots.
**Niche/hub tendency:** Authorship is held by agencies or government. Very little ownership is involved.
**Illustrative:** "I ♥ NY", "100% Pure New Zealand", "Incredible !ndia", "Keep Austin Weird" (grassroots origin, a notable contrast), Amsterdam's de-marketing turn.

### digital_virality
**Definition:** A sudden surge in demand driven by social media, a viral image, an influencer or a platform algorithm, rather than by traditional media.
**Mechanism:** One shareable image or spot drives very high visitor counts to a tiny area, often in a matter of months.
**Second-order risks:** Extreme crowding at a single spot; residents push back; demand collapses once the trend fades.
**Niche/hub tendency:** No one authors it. The place reacts to it.
**Illustrative:** Hallstatt, Fujikawaguchiko (Lawson Mt Fuji view barrier, 2024), Lake Tekapo, Trolltunga, Instagrammable "painted villages".

## Family E — Governors (shape volume and who benefits)

### visitor_caps_high_value
**Definition:** Policies that limit or price access to manage how many visitors come, and to raise spend per visitor: entry fees, daily caps, permits, minimum daily spend, cruise bans.
**Mechanism:** Raises the price and lowers the volume, and funds conservation or local services.
**Second-order risks:** Turns the place into a destination only for the wealthy; enforcement costs; demand moves to nearby places.
**Niche/hub tendency:** This is the defining move of the "Deliberate Steward" archetype.
**Illustrative:** Bhutan (SDF), Galápagos, Palau Pledge, Venice day-tripper fee (2024), Machu Picchu timed entry, Maya Bay closure.

### housing_str_regulation
**Definition:** Rules on short-term rentals, second homes, tourist housing, or resident-only zoning, aimed at shielding residents from tourism's effect on housing.
**Mechanism:** Takes housing stock back from tourist use.
**Second-order risks:** Displacement moves to areas without rules; lodging shifts into informal markets; lawsuits.
**Niche/hub tendency:** Defensive. Shows whether a place can govern its own success.
**Illustrative:** Barcelona (HUT licensing, 2028 phase-out), Amsterdam, Lisbon, Swiss second-home initiative (2012), New York Local Law 18.

### community_ownership_model
**Definition:** Structures that put land, attractions or tourism businesses under collective local ownership: community land trusts, buy-outs, co-ops, municipal ownership, community benefit agreements.
**Mechanism:** Changes who captures the value created by the transformation.
**Second-order risks:** Capital shortages; disputes over how it is governed; the model is hard to scale.
**Niche/hub tendency:** The explicit lever for value capture. This is the one to watch for the question of how a host becomes an originator.
**Illustrative:** Isle of Eigg buy-out, Mondragón-style tourism co-ops, Green Bay Packers (community-owned anchor), Dudley Street Neighborhood Initiative.

---

## Proposed additions to the original list, and why

The brief named 18 types. I added 9:

| Added | Why it couldn't fold into an existing type |
|---|---|
| `designation_listing` | UNESCO and Capital of Culture labels change visitor numbers with no construction at all. It is a distinct and copyable lever, and the overtourism cases (Hallstatt, Venice) depend on it. |
| `place_branding_campaign` | Pure narrative moves need their own type so we can test whether marketing alone ever works. |
| `waterfront_brownfield_regeneration` | The dominant urban regeneration move since the 1970s. It isn't an anchor or infrastructure in itself. |
| `gaming_casino` | Las Vegas, Macau and Atlantic City follow a common pattern of regulatory monopoly followed by erosion. Calling them `special_district_tax_regime` would lose that. |
| `amenity_migration_remote_work` | Attracts residents rather than visitors. Increasingly the real goal of small-town strategy, and its housing effects differ from tourism's. |
| `housing_str_regulation` | Mitigations must be first-class interventions or we can't judge whether they work. |
| `community_ownership_model` | Directly operationalizes research question 3 (value capture). |
| `indigenous_led_tourism` | Ownership and authorship are the whole point; lumping it into heritage would erase exactly the distinction this atlas cares about. |
| `cruise_port` | Its volume and spending pattern is distinct and it shows up in most overtourism cases. |

I considered and rejected:
- **"retail/outlet tourism":** too thin; record it as a secondary note.
- **"education tourism":** fold into `anchor_institution`.
- **"crisis rebuild":** that is a trigger, not an intervention.
- **"local-led" vs "outside-led" variants of each type:** that is a facet (`actors[].locality`), not a type.

## Archetype definitions (draft, for `niche_vs_hub_assessment`)

These are working definitions to test against evidence in Phase 6. They are not final.

- **Originator:** The core attraction or industry was born locally, locals mostly own the story, and value mostly stays local.
- **Originator-turned-Hub:** It started local, but scale brought outside capital, firms or IP, and they now dominate. The place became the platform for other people's businesses.
- **Host:** The core attraction is imported (outside IP, outside capital, a franchise branch). The place supplies land, access, labor and concessions.
- **Host-turned-Originator:** It started as a host, then grew its own firms, talent and IP from what it hosted.
- **Hollowed Hub:** It was once a hub. The anchor industry or company left or shrank, and the identity outlived the economics.
- **Deliberate Steward:** It chose to cap or shape growth (volume, ownership, land use) to keep control, accepting slower growth.
- **unclassified:** The evidence doesn't support a call yet.
