/**
 * Smart Compose Client Script — Zoho CRM (Referrals / Deals module)
 * 
 * Adds an inline "Smart Compose" button to the record detail page.
 * Opens a modal showing email recipients from the record with To/Cc/Bcc routing.
 * Opens Zoho's native email composer with pre-filled recipients.
 * 
 * INSTALLATION:
 *   Setup → Developer Space → Client Scripts → Create
 *   Function: ZOHO_RECORD_DETAIL_PAGE_LOAD
 *   Module: Referrals (or Deals)
 *   Paste this entire script
 */

(function() {

  // ============================================================
  // CONFIG — match your field API names
  // ============================================================
  const EMAIL_FIELDS = [
    { field: "Adjuster_Email",  role: "Adjuster",  nameField: "Adjuster_Name" },
    { field: "Email",           role: "Claimant",   nameField: "Claimant_Name" },
    { field: "Physician_Email", role: "Physician",  nameField: "Physician_Name" },
    { field: "NCM_Email",       role: "NCM",        nameField: "NCM_Name" },
    { field: "Prov_Email",      role: "Provider",   nameField: "Provider_Name" },
    { field: "Atty_Email",      role: "Attorney",   nameField: "Attorney_Name" }
  ];

  // ============================================================
  // State
  // ============================================================
  let recordId = "";
  let moduleName = "";

  // ============================================================
  // Main entry
  // ============================================================
  function init() {
    try {
      recordId = ZDK.Page.getRecordId();
      moduleName = ZDK.Page.getModuleName();
    } catch (e) {
      // Fallback: read from URL
      recordId = getParamFromURL("id") || getParamFromURL("recordId") || "";
      moduleName = getParamFromURL("module") || "Deals";
    }
    if (!recordId) {
      console.warn("SmartCompose: No record ID found.");
      return;
    }
    injectButton();
  }

  // ============================================================
  // Inject button into the record page
  // ============================================================
  function injectButton() {
    var btn = document.createElement("div");
    btn.id = "kai-smart-compose-btn";
    btn.innerHTML = "📧 Smart Compose";
    btn.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:9999",
      "background:#1976d2",
      "color:#fff",
      "padding:10px 20px",
      "border-radius:8px",
      "font-size:14px",
      "font-weight:600",
      "font-family:-apple-system,system-ui,sans-serif",
      "cursor:pointer",
      "box-shadow:0 4px 12px rgba(0,0,0,0.25)",
      "transition: transform 0.15s, box-shadow 0.15s",
      "user-select:none"
    ].join(";");

    btn.addEventListener("mouseenter", function() {
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)";
    });
    btn.addEventListener("mouseleave", function() {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    });

    btn.addEventListener("click", openSmartCompose);
    document.body.appendChild(btn);
  }

  // ============================================================
  // Open the Smart Compose modal
  // ============================================================
  function openSmartCompose() {
    // Fetch record data
    ZDK.Page.getData()
      .then(function(data) {
        if (!data || !data[moduleName]) {
          alert("Smart Compose: Could not load record data.");
          return;
        }
        var record = data[moduleName];

        // Collect available emails
        var emailEntries = [];
        EMAIL_FIELDS.forEach(function(ef) {
          var email = (record[ef.field] || "").trim();
          var name = ef.nameField ? (record[ef.nameField] || "").trim() : "";
          emailEntries.push({
            email: email,
            role: ef.role,
            name: name,
            available: email.length > 0
          });
        });

        buildModal(emailEntries);
      })
      .catch(function(err) {
        console.error("SmartCompose getData failed:", err);
        alert("Smart Compose: Failed to load record data.");
      });
  }

  // ============================================================
  // Build and show the modal
  // ============================================================
  function buildModal(entries) {
    // Overlay
    var overlay = document.createElement("div");
    overlay.id = "kai-modal-overlay";
    overlay.style.cssText = [
      "position:fixed", "top:0", "left:0", "width:100%", "height:100%",
      "background:rgba(0,0,0,0.5)", "z-index:10000",
      "display:flex", "align-items:center", "justify-content:center"
    ].join(";");

    // Modal box
    var box = document.createElement("div");
    box.style.cssText = [
      "background:#fff", "border-radius:12px", "padding:24px",
      "width:440px", "max-width:90vw", "max-height:80vh", "overflow-y:auto",
      "box-shadow:0 8px 32px rgba(0,0,0,0.3)",
      "font-family:-apple-system,system-ui,sans-serif", "font-size:14px"
    ].join(";");

    // Header
    var header = document.createElement("div");
    header.style.cssText = "font-size:18px;font-weight:700;margin-bottom:4px;color:#1a1a1a";
    header.textContent = "📧 Smart Compose";
    box.appendChild(header);

    var sub = document.createElement("div");
    sub.style.cssText = "font-size:13px;color:#666;margin-bottom:16px";
    sub.textContent = "Select recipients and routing.";
    box.appendChild(sub);

    // Email rows
    var anyAvailable = false;
    entries.forEach(function(entry) {
      var row = document.createElement("div");
      row.style.cssText = [
        "display:flex", "align-items:center", "padding:8px 10px",
        "border-radius:6px", "margin-bottom:4px",
        "border:1px solid #e9ecef", "background:#f8f9fa"
      ].join(";");

      if (!entry.available) {
        row.style.opacity = "0.4";
      }

      // Checkbox
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = entry.available;
      cb.disabled = !entry.available;
      cb.style.cssText = "margin-right:10px;cursor:pointer;width:16px;height:16px";
      if (!entry.available) cb.style.cursor = "not-allowed";
      row.appendChild(cb);

      // Info
      var info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0";
      var roleSpan = document.createElement("div");
      roleSpan.style.cssText = "font-weight:600;font-size:13px;color:#333";
      roleSpan.textContent = entry.role;
      var emailSpan = document.createElement("div");
      emailSpan.style.cssText = "font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      emailSpan.textContent = entry.available
        ? entry.email + (entry.name ? " — " + entry.name : "")
        : "No email on record";
      info.appendChild(roleSpan);
      info.appendChild(emailSpan);
      row.appendChild(info);

      // Route dropdown
      var select = document.createElement("select");
      select.disabled = !entry.available;
      select.style.cssText = [
        "font-size:11px", "color:#1976d2", "border:1px solid #ccc",
        "background:#fff", "border-radius:3px", "padding:2px 4px", "cursor:pointer"
      ].join(";");
      ["To", "Cc", "Bcc"].forEach(function(opt) {
        var o = document.createElement("option");
        o.value = opt.toLowerCase();
        o.textContent = opt;
        select.appendChild(o);
      });
      row.appendChild(select);

      box.appendChild(row);
      if (entry.available) anyAvailable = true;
    });

    if (!anyAvailable) {
      var noEmail = document.createElement("div");
      noEmail.style.cssText = "text-align:center;padding:20px;color:#999;font-size:14px";
      noEmail.textContent = "No email addresses found on this record.";
      box.appendChild(noEmail);
    }

    // Buttons
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #e9ecef";

    var cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "padding:8px 18px;font-size:13px;font-weight:500;border:none;border-radius:6px;cursor:pointer;background:#e9ecef;color:#333";

    var sendBtn = document.createElement("button");
    sendBtn.textContent = anyAvailable ? "Open Email Composer" : "Close";
    sendBtn.style.cssText = "padding:8px 18px;font-size:13px;font-weight:500;border:none;border-radius:6px;cursor:pointer;background:#1976d2;color:#fff";

    cancelBtn.addEventListener("click", function() { closeModal(overlay); });
    sendBtn.addEventListener("click", function() {
      if (!anyAvailable) { closeModal(overlay); return; }
      handleSend(overlay);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(sendBtn);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ============================================================
  // Handle send: collect selections and open email composer
  // ============================================================
  function handleSend(overlay) {
    var box = overlay.firstChild;
    var toList = [], ccList = [], bccList = [];

    // Row type is always Node.ELEMENT_NODE = 1
    var rows = box.querySelectorAll('div[style*="flex"]');
    rows.forEach(function(row) {
      if (row.nodeType !== 1) return;
      var cb = row.querySelector('input[type="checkbox"]');
      if (!cb || !cb.checked || cb.disabled) return;

      var select = row.querySelector('select');
      if (!select) return;

      // Email is in the second span inside the info div
      var infoDiv = row.querySelector('div[style*="flex:1"]');
      if (!infoDiv) return;
      var spans = infoDiv.querySelectorAll('span, div');
      var emailText = "";
      for (var i = 0; i < spans.length; i++) {
        var t = spans[i].textContent;
        if (t.indexOf("@") > -1) {
          emailText = t.split(" — ")[0].trim();
          break;
        }
      }
      if (!emailText) return;

      var route = select.value;
      if (route === "to") toList.push(emailText);
      else if (route === "cc") ccList.push(emailText);
      else if (route === "bcc") bccList.push(emailText);
    });

    if (toList.length === 0 && ccList.length === 0 && bccList.length === 0) {
      alert("Please select at least one recipient.");
      return;
    }

    closeModal(overlay);

    // Try ZDK email compose
    try {
      ZDK.Email.compose({
        to: toList.join(","),
        cc: ccList.join(","),
        bcc: bccList.join(",")
      });
    } catch (e) {
      console.error("SmartCompose ZDK.Email.compose failed:", e);
      // Fallback: open standard email window
      var url = "/crm/EntityInfo.do?module=" + moduleName + "&id=" + recordId + "&actionType=SendEmail";
      url += "&to=" + encodeURIComponent(toList.join(","));
      url += "&cc=" + encodeURIComponent(ccList.join(","));
      window.open(url, "_blank", "width=800,height=600");
    }
  }

  // ============================================================
  // Close modal
  // ============================================================
  function closeModal(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // ============================================================
  // URL parameter helper (fallback)
  // ============================================================
  function getParamFromURL(name) {
    var match = window.location.search.match(new RegExp("[?&]" + name + "=([^&]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  // ============================================================
  // Boot
  // ============================================================
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

})();