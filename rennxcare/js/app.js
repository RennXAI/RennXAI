/* =========================================================
   RennXCare — App / Rendering Logic
   Reads URL params to hydrate city.html and agency.html.
   Handles search/filter on hub and city pages.
   ========================================================= */

/* ------------------------------------------------------------------
   SHARED NAV TOGGLE (mobile)
   ------------------------------------------------------------------ */
function initNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("nav-mobile");
  if (!toggle || !mobileMenu) return;

  toggle.addEventListener("click", () => {
    const open = mobileMenu.style.display === "block";
    mobileMenu.style.display = open ? "none" : "block";
    toggle.setAttribute("aria-expanded", String(!open));
  });
}

/* ------------------------------------------------------------------
   AGENCY CARD HTML
   ------------------------------------------------------------------ */
function agencyCardHTML(agency, clickSource = "card") {
  const stars = renderStars(agency.rating);
  const servicesPills = agency.services
    .slice(0, 3)
    .map(s => `<span class="pill pill-light">${s}</span>`)
    .join("");

  const featuredBadge = agency.featured
    ? `<span class="badge-featured">Featured</span>`
    : "";
  const partnerBadge = agency.rxCarePartner
    ? `<span class="badge-partner">RX-Care Partner</span>`
    : "";

  const profileUrl = `agency.html?city=${agency.citySlug}&agency=${agency.slug}`;

  return `
    <article class="agency-card${agency.featured ? " featured" : ""}"
             data-agency-id="${agency.id}"
             data-city="${agency.citySlug}">
      <div class="flex-between gap-8">
        <div class="flex gap-8">
          ${featuredBadge}
          ${partnerBadge}
        </div>
      </div>
      <div>
        <h3>${agency.name}</h3>
        <p class="city-label">${agency.city}, ${agency.state}</p>
      </div>
      <div class="rating-row" aria-label="Rating: ${agency.rating} out of 5">
        <span class="stars" aria-hidden="true">${stars}</span>
        <span class="rating-score">${agency.rating}</span>
        <span class="rating-count">(${agency.reviewCount} reviews)</span>
      </div>
      <p class="description">${agency.description}</p>
      <div class="services" role="list" aria-label="Services offered">${servicesPills}</div>
      <div class="agency-card-footer">
        <a class="btn btn-outline btn-sm btn-full"
           href="${profileUrl}"
           onclick="if(window.RXTracking) RXTracking.agencyProfileClick('${agency.name}', ${agency.id}, '${agency.citySlug}', '${clickSource}')">
          View Profile →
        </a>
      </div>
    </article>
  `;
}

/* ------------------------------------------------------------------
   HUB PAGE — index.html
   Renders featured agencies and city grid.
   ------------------------------------------------------------------ */
function initHubPage() {
  /* City grid */
  const cityGrid = document.getElementById("city-grid");
  if (cityGrid) {
    const cities = getActiveCities();
    cityGrid.innerHTML = cities.map(city => {
      const count = getAgenciesByCity(city.name.toLowerCase().replace(/\s+/g, "-")).length
        || RENNXCARE_AGENCIES.filter(a => a.citySlug === Object.keys(CA_CITIES).find(k => CA_CITIES[k] === city)).length;
      const agencyCount = RENNXCARE_AGENCIES.filter(a => {
        const cityKey = Object.keys(CA_CITIES).find(k => CA_CITIES[k] === city);
        return a.citySlug === cityKey;
      }).length;
      const cityKey = Object.keys(CA_CITIES).find(k => CA_CITIES[k] === city);
      return `
        <a class="city-card card-link"
           href="city.html?city=${cityKey}"
           aria-label="View home care agencies in ${city.name}">
          <div class="city-card">
            <h3>${city.name}</h3>
            <p class="agency-count muted">${agencyCount} ${agencyCount === 1 ? "agency" : "agencies"} listed</p>
            <p class="caption">${city.county}</p>
          </div>
        </a>
      `;
    }).join("");
  }

  /* Featured agencies */
  const featuredGrid = document.getElementById("featured-agencies");
  if (featuredGrid) {
    const featured = getFeaturedAgencies(6);
    featuredGrid.innerHTML = featured.map(a => agencyCardHTML(a, "featured")).join("");
  }

  /* Hub search */
  const searchInput  = document.getElementById("hub-search");
  const searchBtn    = document.getElementById("hub-search-btn");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const val = searchInput.value.trim().toLowerCase();
      if (!val) return;
      const match = Object.keys(CA_CITIES).find(k =>
        CA_CITIES[k].name.toLowerCase().includes(val)
      );
      if (match) {
        window.location.href = `city.html?city=${match}`;
      } else {
        showHubSearchResults(val);
      }
      if (window.RXTracking) RXTracking.directorySearch(val);
    });
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") searchBtn.click();
    });
  }
}

function showHubSearchResults(query) {
  const results = RENNXCARE_AGENCIES.filter(a =>
    a.name.toLowerCase().includes(query) ||
    a.city.toLowerCase().includes(query) ||
    a.services.some(s => s.toLowerCase().includes(query))
  );
  const container = document.getElementById("hub-search-results");
  if (!container) return;
  container.innerHTML = results.length
    ? `<h3 class="mt-16 mb-16">Search results for "${query}"</h3>
       <div class="grid g-agency">${results.map(a => agencyCardHTML(a, "search_result")).join("")}</div>`
    : `<p class="mt-16 muted">No agencies found for "${query}". Try a city name or service type.</p>`;
  container.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------
   CITY PAGE — city.html
   Reads ?city= param, renders city info + agency listing + filter.
   ------------------------------------------------------------------ */
function initCityPage() {
  const params   = new URLSearchParams(window.location.search);
  const citySlug = params.get("city");

  if (!citySlug || !CA_CITIES[citySlug]) {
    document.getElementById("city-content").innerHTML =
      `<p class="muted">City not found. <a href="index.html">Browse all cities →</a></p>`;
    return;
  }

  const cityData = CA_CITIES[citySlug];
  let agencies   = getAgenciesByCity(citySlug);

  /* Update page meta */
  document.title = cityData.metaTitle;
  setMeta("description", cityData.metaDescription);

  /* Update visible headings */
  const h1El = document.getElementById("city-h1");
  if (h1El) h1El.textContent = cityData.h1;

  const introEl = document.getElementById("city-intro");
  if (introEl) introEl.textContent = cityData.intro;

  const kickerEl = document.getElementById("city-kicker");
  if (kickerEl) kickerEl.textContent = `/home-care-agencies/${citySlug}`;

  /* Breadcrumb */
  updateBreadcrumb([
    { label: "Home Care Agencies", href: "index.html" },
    { label: cityData.name, href: "#" },
  ]);

  /* Update hidden form fields */
  document.querySelectorAll("[name=city]").forEach(el => { el.value = cityData.name; });
  document.querySelectorAll("[name=source_page]").forEach(el => {
    el.value = `/home-care-agencies/${citySlug}`;
  });

  /* Update LocalBusiness schema */
  injectCitySchema(cityData, agencies);

  /* Render agency cards */
  renderAgencyGrid(agencies, "city-agencies");

  /* Agency count badge */
  const countEl = document.getElementById("agency-count");
  if (countEl) countEl.textContent = `${agencies.length} agencies`;

  /* Filter listeners */
  initCityFilters(agencies, cityData);
}

function initCityFilters(allAgencies, cityData) {
  const serviceFilter = document.getElementById("filter-service");
  const ratingFilter  = document.getElementById("filter-rating");
  const sortSelect    = document.getElementById("sort-agencies");
  const searchInput   = document.getElementById("city-search");

  function applyFilters() {
    let filtered = [...allAgencies];

    const query   = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const service = serviceFilter ? serviceFilter.value : "";
    const minRating = ratingFilter ? parseFloat(ratingFilter.value) || 0 : 0;
    const sort    = sortSelect ? sortSelect.value : "featured";

    if (query) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.services.some(s => s.toLowerCase().includes(query))
      );
    }
    if (service) {
      filtered = filtered.filter(a => a.services.includes(service));
    }
    if (minRating) {
      filtered = filtered.filter(a => a.rating >= minRating);
    }
    if (sort === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === "reviews") {
      filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      /* Featured first */
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    renderAgencyGrid(filtered, "city-agencies");
    const countEl = document.getElementById("agency-count");
    if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "agency" : "agencies"}`;

    if (window.RXTracking) {
      RXTracking.directorySearch(query, { service, minRating, sort });
    }
  }

  [serviceFilter, ratingFilter, sortSelect].forEach(el => {
    if (el) el.addEventListener("change", applyFilters);
  });
  if (searchInput) searchInput.addEventListener("input", applyFilters);
}

function renderAgencyGrid(agencies, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (agencies.length === 0) {
    container.innerHTML = `<p class="muted" style="grid-column:1/-1">No agencies match your filters. <button class="btn btn-ghost btn-sm" onclick="location.reload()">Clear filters</button></p>`;
    return;
  }
  container.innerHTML = agencies.map(a => agencyCardHTML(a, "card")).join("");
}

/* ------------------------------------------------------------------
   AGENCY PROFILE PAGE — agency.html
   Reads ?city= and ?agency= params.
   ------------------------------------------------------------------ */
function initAgencyPage() {
  const params    = new URLSearchParams(window.location.search);
  const citySlug  = params.get("city");
  const agencySlug = params.get("agency");
  const agency    = getAgencyBySlug(agencySlug);

  const content = document.getElementById("agency-content");

  if (!agency) {
    if (content) content.innerHTML =
      `<p class="muted">Agency not found. <a href="index.html">Browse all agencies →</a></p>`;
    return;
  }

  /* Page meta */
  document.title = `${agency.name} | Home Care in ${agency.city}, CA | RennXCare`;
  setMeta("description",
    `${agency.name} offers ${agency.services.slice(0,2).join(" and ")} in ${agency.city}, CA. ` +
    `Rated ${agency.rating}/5 by ${agency.reviewCount} clients. Request care or apply as a caregiver.`
  );

  /* LocalBusiness schema */
  injectAgencySchema(agency);

  /* Breadcrumb */
  updateBreadcrumb([
    { label: "Home Care Agencies", href: "index.html" },
    { label: agency.city, href: `city.html?city=${agency.citySlug}` },
    { label: agency.name, href: "#" },
  ]);

  /* Title area */
  const nameEl = document.getElementById("profile-name");
  if (nameEl) nameEl.textContent = agency.name;

  const subEl = document.getElementById("profile-sub");
  if (subEl) subEl.textContent = `${agency.city}, ${agency.state} • Est. ${agency.founded}`;

  const kickerEl = document.getElementById("profile-kicker");
  if (kickerEl) kickerEl.textContent = `/home-care-agencies/${agency.citySlug}/${agency.slug}`;

  /* Badges */
  const badgesEl = document.getElementById("profile-badges");
  if (badgesEl) {
    badgesEl.innerHTML =
      (agency.featured ? `<span class="badge-featured">Featured</span>` : "") +
      (agency.rxCarePartner ? `<span class="badge-partner">RX-Care Partner</span>` : "");
  }

  /* Rating */
  const ratingEl = document.getElementById("profile-rating");
  if (ratingEl) {
    ratingEl.innerHTML = `
      <span class="stars" aria-hidden="true">${renderStars(agency.rating)}</span>
      <span class="rating-score">${agency.rating}</span>
      <span class="rating-count">(${agency.reviewCount} reviews)</span>
    `;
    ratingEl.setAttribute("aria-label", `Rated ${agency.rating} out of 5 by ${agency.reviewCount} clients`);
  }

  /* Description */
  const descEl = document.getElementById("profile-description");
  if (descEl) descEl.textContent = agency.longDescription || agency.description;

  /* Services list */
  const servicesEl = document.getElementById("profile-services");
  if (servicesEl) {
    servicesEl.innerHTML = agency.services
      .map(s => `<li class="flex gap-8" style="font-size:14px;padding:6px 0;border-bottom:1px solid var(--line-lt)"><span style="color:var(--primary)">✓</span>${s}</li>`)
      .join("");
  }

  /* Agency details table */
  const detailsEl = document.getElementById("profile-details");
  if (detailsEl) {
    const rows = [
      ["Location", `${agency.address}`],
      ["Phone", `<a href="tel:${agency.phone}">${agency.phone}</a>`],
      ["Hours", agency.hours],
      ["Founded", agency.founded],
      ["License", agency.licenseNumber],
    ];
    detailsEl.innerHTML = rows.map(([label, value]) =>
      `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`
    ).join("");
  }

  /* Populate hidden form fields with agency context */
  document.querySelectorAll("[name=agency_id]").forEach(el => { el.value = agency.id; });
  document.querySelectorAll("[name=agency_name]").forEach(el => { el.value = agency.name; });
  document.querySelectorAll("[name=city]").forEach(el => { el.value = agency.city; });
  document.querySelectorAll("[name=source_page]").forEach(el => {
    el.value = `/home-care-agencies/${agency.citySlug}/${agency.slug}`;
  });

  /* RX-Care CTA tracking */
  const rxBtn = document.getElementById("rxcare-cta-btn");
  if (rxBtn) {
    rxBtn.addEventListener("click", () => {
      if (window.RXTracking) RXTracking.rxCareCTAClick("agency_profile", String(agency.id));
    });
  }
}

/* ------------------------------------------------------------------
   SCHEMA INJECTION HELPERS
   ------------------------------------------------------------------ */
function injectAgencySchema(agency) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://rennxcare.com/home-care-agencies/${agency.citySlug}/${agency.slug}`,
    "name": agency.name,
    "description": agency.description,
    "url": `https://rennxcare.com/home-care-agencies/${agency.citySlug}/${agency.slug}`,
    "telephone": agency.phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": agency.address.split(",")[0] || agency.address,
      "addressLocality": agency.city,
      "addressRegion": agency.state,
      "postalCode": agency.zip,
      "addressCountry": "US",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": agency.lat,
      "longitude": agency.lng,
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": agency.rating,
      "reviewCount": agency.reviewCount,
      "bestRating": 5,
    },
    "openingHours": agency.hours,
    "foundingDate": String(agency.founded),
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Home Care Services",
      "itemListElement": agency.services.map(s => ({
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": s },
      })),
    },
  };

  let el = document.getElementById("agency-schema");
  if (!el) {
    el = document.createElement("script");
    el.id = "agency-schema";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema, null, 2);
}

function injectCitySchema(cityData, agencies) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Home Care Agencies in ${cityData.name}, CA`,
    "description": cityData.metaDescription,
    "url": `https://rennxcare.com/home-care-agencies/${Object.keys(CA_CITIES).find(k => CA_CITIES[k] === cityData)}`,
    "itemListElement": agencies.map((a, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": a.name,
        "url": `https://rennxcare.com/home-care-agencies/${a.citySlug}/${a.slug}`,
        "telephone": a.phone,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": a.rating,
          "reviewCount": a.reviewCount,
        },
      },
    })),
  };

  let el = document.getElementById("city-schema");
  if (!el) {
    el = document.createElement("script");
    el.id = "city-schema";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema, null, 2);
}

/* ------------------------------------------------------------------
   BREADCRUMB HELPER
   ------------------------------------------------------------------ */
function updateBreadcrumb(items) {
  const el = document.getElementById("breadcrumb");
  if (!el) return;
  el.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    return (isLast
      ? `<span aria-current="page">${item.label}</span>`
      : `<a href="${item.href}">${item.label}</a><span class="breadcrumb-sep" aria-hidden="true"> / </span>`
    );
  }).join("");

  /* BreadcrumbList schema */
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.label,
      "item": item.href !== "#"
        ? `https://rennxcare.com${item.href.replace(".html", "")}`
        : undefined,
    })).filter(x => x.item),
  };

  let schemaEl = document.getElementById("breadcrumb-schema");
  if (!schemaEl) {
    schemaEl = document.createElement("script");
    schemaEl.id = "breadcrumb-schema";
    schemaEl.type = "application/ld+json";
    document.head.appendChild(schemaEl);
  }
  schemaEl.textContent = JSON.stringify(schema, null, 2);
}

/* ------------------------------------------------------------------
   META TAG HELPER
   ------------------------------------------------------------------ */
function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

/* ------------------------------------------------------------------
   INIT ROUTER — detect which page we're on and run the right init
   ------------------------------------------------------------------ */
function init() {
  initNavToggle();

  const body = document.body;
  const page = body.dataset.page;

  if (page === "hub")    initHubPage();
  if (page === "city")   initCityPage();
  if (page === "agency") initAgencyPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
