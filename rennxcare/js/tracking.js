/* =========================================================
   RennXCare — Analytics & Tracking Events
   =========================================================
   Fires events to:
   1. window.dataLayer (Google Tag Manager / GA4)
   2. window.fbq       (Meta Pixel — optional)
   3. window.ttq       (TikTok Pixel — optional)
   4. console.log in dev mode

   To enable GTM: paste your GTM container snippet in each
   HTML page's <head> before this script loads.

   To enable Meta Pixel: paste your Pixel base code in <head>
   before this script loads.
   ========================================================= */

const RXTracking = (() => {

  /* ---- Internal push helper -------------------------- */
  function push(eventName, params = {}) {
    const payload = {
      event: eventName,
      rennxcare_version: "1.0",
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      ...params,
    };

    /* GTM / GA4 dataLayer */
    if (window.dataLayer) {
      window.dataLayer.push(payload);
    }

    /* Meta Pixel custom event */
    if (window.fbq) {
      window.fbq("trackCustom", eventName, params);
    }

    /* TikTok Pixel custom event */
    if (window.ttq) {
      window.ttq.track(eventName, params);
    }

    /* Dev console */
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log("[RXTracking]", eventName, payload);
    }
  }

  /* ---- Public API ------------------------------------ */

  /**
   * Track a page view with page type context.
   * @param {"hub"|"city"|"agency"} pageType
   * @param {string} [city] - City slug
   * @param {string} [agencyName] - Agency name
   */
  function pageView(pageType, city = "", agencyName = "") {
    push("rennxcare_page_view", {
      page_type: pageType,
      city,
      agency_name: agencyName,
    });
  }

  /**
   * Track client lead form submission.
   * Called from forms.js on successful submit.
   * @param {string} city
   * @param {"hero"|"city_section"|"agency_profile"|"sidebar"} formLocation
   * @param {string} [agencySlug] - If submitted on an agency page
   */
  function clientFormSubmit(city, formLocation, agencySlug = "") {
    push("rennxcare_client_form_submit", {
      city,
      form_location: formLocation,
      agency_slug: agencySlug,
      lead_type: "client",
    });

    /* GA4 conversion event */
    if (window.gtag) {
      window.gtag("event", "generate_lead", {
        event_category: "Lead",
        event_label: `client_${city}`,
        value: 1,
      });
    }

    /* Meta Pixel Lead event */
    if (window.fbq) {
      window.fbq("track", "Lead", { lead_type: "client", city });
    }
  }

  /**
   * Track caregiver application form submission.
   * @param {string} city
   * @param {"hero"|"city_section"|"agency_profile"|"sidebar"} formLocation
   */
  function caregiverFormSubmit(city, formLocation) {
    push("rennxcare_caregiver_form_submit", {
      city,
      form_location: formLocation,
      lead_type: "caregiver",
    });

    if (window.gtag) {
      window.gtag("event", "generate_lead", {
        event_category: "Lead",
        event_label: `caregiver_${city}`,
        value: 1,
      });
    }

    if (window.fbq) {
      window.fbq("track", "Lead", { lead_type: "caregiver", city });
    }
  }

  /**
   * Track RX-Care CTA click (agency monetization funnel).
   * @param {"agency_profile"|"city_page"|"hub"|"sidebar"} location
   * @param {string} [agencyId] - ID of the agency whose profile showed the CTA
   */
  function rxCareCTAClick(location, agencyId = "") {
    push("rennxcare_rxcare_cta_click", {
      cta_location: location,
      agency_id: agencyId,
    });

    if (window.gtag) {
      window.gtag("event", "click", {
        event_category: "RX-Care CTA",
        event_label: location,
      });
    }
  }

  /**
   * Track a click through to an agency profile page.
   * @param {string} agencyName
   * @param {number|string} agencyId
   * @param {string} city
   * @param {"card"|"search_result"|"featured"} clickSource
   */
  function agencyProfileClick(agencyName, agencyId, city, clickSource = "card") {
    push("rennxcare_agency_profile_click", {
      agency_name: agencyName,
      agency_id: String(agencyId),
      city,
      click_source: clickSource,
    });

    if (window.gtag) {
      window.gtag("event", "select_item", {
        item_list_name: `agency_directory_${city}`,
        items: [{ item_name: agencyName, item_id: String(agencyId) }],
      });
    }
  }

  /**
   * Track search / filter interactions on directory pages.
   * @param {string} query
   * @param {Object} filters - Active filter values
   */
  function directorySearch(query, filters = {}) {
    push("rennxcare_directory_search", {
      search_query: query,
      filters: JSON.stringify(filters),
    });
  }

  /* ---- Auto page-view on load ------------------------ */
  function autoPageView() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const city = params.get("city") || "";
    const agency = params.get("agency") || "";

    let pageType = "hub";
    if (agency) pageType = "agency";
    else if (city) pageType = "city";

    pageView(pageType, city, agency);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoPageView);
  } else {
    autoPageView();
  }

  return {
    pageView,
    clientFormSubmit,
    caregiverFormSubmit,
    rxCareCTAClick,
    agencyProfileClick,
    directorySearch,
  };
})();
