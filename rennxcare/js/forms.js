/* =========================================================
   RennXCare — Form Handlers & GoHighLevel Webhook Integration
   =========================================================

   ╔══════════════════════════════════════════════════════╗
   ║  HOW TO CONNECT TO GOHIGHLEVEL                       ║
   ║                                                      ║
   ║  1. In GHL > Settings > Integrations > Webhooks,    ║
   ║     create a new inbound webhook.                    ║
   ║  2. Copy the webhook URL and paste it into the       ║
   ║     GHL_WEBHOOKS object below.                       ║
   ║  3. In GHL, set up a Workflow triggered by the       ║
   ║     webhook. Tag the contact with the lead_type      ║
   ║     field value ("client_lead" or "caregiver_lead"). ║
   ╚══════════════════════════════════════════════════════╝

   ========================================================= */

/* ------------------------------------------------------------------
   GoHighLevel Webhook URLs
   Replace placeholder values with your real GHL webhook endpoints.
   ------------------------------------------------------------------ */
const GHL_WEBHOOKS = {
  /* ▼▼▼ PLUG IN YOUR GHL CLIENT LEAD WEBHOOK URL HERE ▼▼▼ */
  clientLead: "https://services.leadconnectorhq.com/hooks/YOUR_CLIENT_LEAD_WEBHOOK_ID/webhook-trigger/YOUR_TOKEN",

  /* ▼▼▼ PLUG IN YOUR GHL CAREGIVER LEAD WEBHOOK URL HERE ▼▼▼ */
  caregiverLead: "https://services.leadconnectorhq.com/hooks/YOUR_CAREGIVER_LEAD_WEBHOOK_ID/webhook-trigger/YOUR_TOKEN",

  /* ▼▼▼ PLUG IN YOUR GHL RX-CARE INTEREST WEBHOOK URL HERE ▼▼▼ */
  rxCareInterest: "https://services.leadconnectorhq.com/hooks/YOUR_RXCARE_WEBHOOK_ID/webhook-trigger/YOUR_TOKEN",
};

/* ------------------------------------------------------------------
   GHL Pipeline / Tag Mapping
   Customize these to match your GHL pipeline stages and tags.
   ------------------------------------------------------------------ */
const GHL_TAGS = {
  clientLead:    ["client_lead", "directory_source"],
  caregiverLead: ["caregiver_lead", "directory_source"],
  rxCareInterest:["rxcare_interest", "agency_prospect"],
};

/* ------------------------------------------------------------------
   UTILITY: Post JSON payload to a GHL webhook
   ------------------------------------------------------------------ */
async function postToGHL(webhookUrl, payload) {
  /* Skip actual POST in local dev / placeholder mode */
  const isPlaceholder = webhookUrl.includes("YOUR_");
  if (isPlaceholder) {
    console.warn("[RennXCare Forms] GHL webhook URL not configured. Payload logged below.");
    console.table(payload);
    return { ok: true, simulated: true };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`GHL webhook error: ${response.status} ${response.statusText}`);
  }
  return response;
}

/* ------------------------------------------------------------------
   UTILITY: Simple inline form validation
   Returns true if valid, false + shows errors if not.
   ------------------------------------------------------------------ */
function validateForm(form) {
  let valid = true;
  const fields = form.querySelectorAll("[required]");

  fields.forEach(field => {
    const group = field.closest(".form-group");
    const errEl = group && group.querySelector(".form-error");

    field.classList.remove("error");
    if (group) group.classList.remove("field-error");
    if (errEl) errEl.classList.remove("visible");

    const value = field.value.trim();

    if (!value) {
      valid = false;
      field.classList.add("error");
      if (group) group.classList.add("field-error");
      if (errEl) { errEl.textContent = "This field is required."; errEl.classList.add("visible"); }
      return;
    }

    /* Email format check */
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      valid = false;
      field.classList.add("error");
      if (group) group.classList.add("field-error");
      if (errEl) { errEl.textContent = "Enter a valid email address."; errEl.classList.add("visible"); }
    }

    /* Phone format check (loose — 7-15 digits) */
    if (field.type === "tel" && value && !/^[\d\s\-()+]{7,15}$/.test(value)) {
      valid = false;
      field.classList.add("error");
      if (group) group.classList.add("field-error");
      if (errEl) { errEl.textContent = "Enter a valid phone number."; errEl.classList.add("visible"); }
    }
  });

  return valid;
}

/* ------------------------------------------------------------------
   UTILITY: Show success state on a form container
   ------------------------------------------------------------------ */
function showFormSuccess(form, successEl) {
  form.style.display = "none";
  successEl.classList.add("visible");
}

/* ------------------------------------------------------------------
   UTILITY: Show toast notification
   ------------------------------------------------------------------ */
function showToast(message, type = "default") {
  let toast = document.getElementById("rx-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "rx-toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

/* ------------------------------------------------------------------
   CLIENT LEAD FORM HANDLER
   Form fields expected (by name attribute):
     full_name*, phone*, email*, city*, care_needs, start_date
   Hidden fields auto-populated:
     lead_type, source_page, source_url, agency_id, agency_name
   ------------------------------------------------------------------ */
async function handleClientForm(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!validateForm(form)) return;

  const data = Object.fromEntries(new FormData(form).entries());

  /* Build GHL payload */
  const payload = {
    /* Contact fields */
    firstName: (data.full_name || "").split(" ")[0],
    lastName:  (data.full_name || "").split(" ").slice(1).join(" "),
    phone:     data.phone,
    email:     data.email,

    /* Custom fields — map these to GHL custom fields */
    city:          data.city,
    care_needs:    data.care_needs || "",
    start_date:    data.start_date || "",
    agency_id:     data.agency_id || "",
    agency_name:   data.agency_name || "",

    /* Metadata */
    lead_type:   "client_lead",
    source_page: data.source_page || window.location.pathname,
    source_url:  window.location.href,
    tags:        GHL_TAGS.clientLead,
  };

  const submitBtn = form.querySelector("[type=submit]");
  const originalText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

  try {
    await postToGHL(GHL_WEBHOOKS.clientLead, payload);

    const successEl = form.parentElement.querySelector(".form-success");
    if (successEl) showFormSuccess(form, successEl);
    else showToast("Request sent! We'll match you within 24 hours.", "success");

    /* Fire tracking event */
    if (window.RXTracking) {
      RXTracking.clientFormSubmit(
        data.city,
        data.form_location || "page",
        data.agency_id || ""
      );
    }

  } catch (err) {
    console.error("[RennXCare Forms] Client lead error:", err);
    showToast("Something went wrong. Please call us directly.", "");
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
  }
}

/* ------------------------------------------------------------------
   CAREGIVER APPLICATION FORM HANDLER
   Form fields expected:
     full_name*, phone*, email*, city*, experience, certifications[],
     availability[]
   ------------------------------------------------------------------ */
async function handleCaregiverForm(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!validateForm(form)) return;

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  /* Collect multi-value checkboxes */
  const certifications = fd.getAll("certifications").join(", ");
  const availability   = fd.getAll("availability").join(", ");

  const payload = {
    firstName:       (data.full_name || "").split(" ")[0],
    lastName:        (data.full_name || "").split(" ").slice(1).join(" "),
    phone:           data.phone,
    email:           data.email,
    city:            data.city,
    experience:      data.experience || "",
    certifications,
    availability,

    lead_type:   "caregiver_lead",
    source_page: data.source_page || window.location.pathname,
    source_url:  window.location.href,
    tags:        GHL_TAGS.caregiverLead,
  };

  const submitBtn = form.querySelector("[type=submit]");
  const originalText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting…"; }

  try {
    await postToGHL(GHL_WEBHOOKS.caregiverLead, payload);

    const successEl = form.parentElement.querySelector(".form-success");
    if (successEl) showFormSuccess(form, successEl);
    else showToast("Application received! We'll be in touch soon.", "success");

    if (window.RXTracking) {
      RXTracking.caregiverFormSubmit(data.city, data.form_location || "page");
    }

  } catch (err) {
    console.error("[RennXCare Forms] Caregiver form error:", err);
    showToast("Something went wrong. Please call us directly.", "");
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
  }
}

/* ------------------------------------------------------------------
   RX-CARE INTEREST FORM HANDLER
   Form fields expected:
     agency_name*, contact_name*, phone*, email*, city*, team_size
   ------------------------------------------------------------------ */
async function handleRxCareForm(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!validateForm(form)) return;

  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    firstName:    (data.contact_name || "").split(" ")[0],
    lastName:     (data.contact_name || "").split(" ").slice(1).join(" "),
    phone:        data.phone,
    email:        data.email,
    agency_name:  data.agency_name,
    city:         data.city,
    team_size:    data.team_size || "",

    lead_type:   "rxcare_interest",
    source_page: window.location.pathname,
    source_url:  window.location.href,
    tags:        GHL_TAGS.rxCareInterest,
  };

  const submitBtn = form.querySelector("[type=submit]");
  const originalText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

  try {
    await postToGHL(GHL_WEBHOOKS.rxCareInterest, payload);

    const successEl = form.parentElement.querySelector(".form-success");
    if (successEl) showFormSuccess(form, successEl);
    else showToast("Request received! Our team will contact you within 1 business day.", "success");

    if (window.RXTracking) {
      RXTracking.rxCareCTAClick("rxcare_form", data.agency_name || "");
    }

  } catch (err) {
    console.error("[RennXCare Forms] RX-Care form error:", err);
    showToast("Something went wrong. Please email us directly.", "");
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
  }
}

/* ------------------------------------------------------------------
   BIND HANDLERS
   Attach to any form with matching data-form-type attributes.
   ------------------------------------------------------------------ */
function bindFormHandlers() {
  document.querySelectorAll("form[data-form-type='client']").forEach(f => {
    f.addEventListener("submit", handleClientForm);
  });
  document.querySelectorAll("form[data-form-type='caregiver']").forEach(f => {
    f.addEventListener("submit", handleCaregiverForm);
  });
  document.querySelectorAll("form[data-form-type='rxcare']").forEach(f => {
    f.addEventListener("submit", handleRxCareForm);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindFormHandlers);
} else {
  bindFormHandlers();
}
