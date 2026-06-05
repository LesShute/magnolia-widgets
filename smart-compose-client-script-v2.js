/**
 * Smart Compose Client Script v2 — Zoho CRM (Referrals / Deals module)
 * 
 * Adds a floating "Smart Compose" button to the record detail page.
 * Opens a modal showing email recipients with To/Cc/Bcc routing.
 * Opens Zoho's native email composer with pre-filled recipients.
 * 
 * v2 fixes: No longer depends on ZDK at page load (handles new Zoho UI).
 * Gets record ID and data only when button is clicked.
 * Multiple fallback methods for maximum compatibility.
 * 
 * INSTALLATION:
 *   Setup → Developer Space → Client Scripts → Create
 *   Category: Module → Page: Detail Page (Standard) → Module: Referrals
 *   Type: Page Event → Event: onLoad
 *   Paste this entire script into the code editor and save.
 */

(function() {

  // ============================================================
  // CONFIG — match your field API names
  // ============================================================
  var EMAIL_FIELDS = [
    { field: "Adjuster_Email",  role: "Adjuster",  nameField: "Adjuster_Name" },
    { field: "Email",           role: "Claimant",   nameField: "Claimant_Name" },
    { field: "Physician_Email", role: "Physician",  nameField: "Physician_Name" },
    { field: "NCM_Email",       role: "NCM",        nameField: "NCM_Name" },
    { field: "Prov_Email",      role: "Provider",   nameField: "Provider_Name" },
    { field: "Atty_Email",      role: "Attorney",   nameField: "Attorney_Name" }
  ];

  // ============================================================
  // Inject the floating button (no ZDK needed at page load)
  // ============================================================
  function injectButton() {
    if (document.getElementById("kai-smart-compose-btn")) return;

    // Skip if not on a record detail page
    var url = window.location.href;
    if (url.indexOf("/detail/") === -1 && url.indexOf("EntityInfo") === -1 && url.indexOf("id=") === -1) {
      setTimeout(injectButton, 2000);
      return;
    }

    var btn = document.createElement("div");
    btn.id = "kai-smart-compose-btn";
    btn.innerHTML = "&#x1F4E7; Smart Compose";
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

    btn.addEventListener("click", function() {
      openSmartCompose(btn);
    });

    document.body.appendChild(btn);
    console.log("SmartCompose: Button injected");
  }

  // ============================================================
  // Get record ID from multiple sources
  // ============================================================
  function getRecordId() {
    // Method 1: ZDK
    try {
      if (typeof ZDK !== "undefined" && ZDK.Page) {
        var id = ZDK.Page.getRecordId();
        if (id) return id;
      }
    } catch (e) {}

    // Method 2: URL parameter
    var match = window.location.search.match(/[?&]id=([^&]*)/);
    if (match) return decodeURIComponent(match[1]);

    // Method 3: New Zoho UI URL pattern (/detail/xxx)
    match = window.location.href.match(/\/detail\/([a-zA-Z0-9]+)/);
    if (match) return match[1];

    // Method 4: Any URL segment that looks like a record ID (24 chars)
    match = window.location.href.match(/\/([0-9a-zA-Z]{24})\b/);
    if (match) return match[1];

    // Method 5: Page data attributes
    var el = document.querySelector('[data-recordid], [data-id], [data-entityid]');
    if (el) {
      return el.getAttribute('data-recordid') || el.getAttribute('data-id') || el.getAttribute('data-entityid');
    }

    return null;
  }

  // ============================================================
  // Get module name from multiple sources
  // ============================================================
  function getModuleName() {
    try {
      if (typeof ZDK !== "undefined" && ZDK.Page) {
        var name = ZDK.Page.getModuleName();
        if (name) return name;
      }
    } catch (e) {}

    var match = window.location.search.match(/[?&]module=([^&]*)/);
    if (match) return decodeURIComponent(match[1]);

    var el = document.querySelector('[data-module], [data-modulename]');
    if (el) {
      return el.getAttribute('data-module') || el.getAttribute('data-modulename');
    }

    return "Deals";
  }

  // ============================================================
  // Fetch record data
  // ============================================================
  function fetchRecordData(callback) {
    var recordId = getRecordId();
    var moduleName = getModuleName();

    if (!recordId) {
      callback(null, "Could not identify this record.");
      return;
    }

    console.log("SmartCompose: Record ID =", recordId, "Module =", moduleName);

    // Try ZDK.Page.getData
    if (typeof ZDK !== "undefined" && ZDK.Page && typeof ZDK.Page.getData === "function") {
      ZDK.Page.getData()
        .then(function(data) {
          if (data && data[moduleName]) {
            callback(data[moduleName], null);
          } else {
            // Try matching any key in data
            var found = false;
            for (var key in data) {
              if (data.hasOwnProperty(key) && typeof data[key] === 'object') {
                callback(data[key], null);
                found = true;
                break;
              }
            }
            if (!found) {
              callback(null, "ZDK returned data but couldn't map to module.");
            }
          }
        })
        .catch(function(err) {
          console.warn("SmartCompose: ZDK.getData failed:", err);
          callback(null, "ZDK error: " + (err.message || "Unknown error"));
        });
    } else {
      callback(null, "ZDK not available on this page.");
    }
  }

  // ============================================================
  // Open the Smart Compose modal
  // ============================================================
  function openSmartCompose(btn) {
    var origText = btn.innerHTML;
    btn.innerHTML = "Loading...";
    btn.style.opacity = "0.6";
    btn.style.cursor = "wait";

    fetchRecordData(function(record, error) {
      btn.innerHTML = origText;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";

      if (error || !record) {
        alert("Smart Compose Error\n\n" + (error || "Could not load record data."));
        return;
      }

      console.log("SmartCompose: Record data loaded", record);

      // Collect email entries
      var emailEntries = [];
      var anyAvailable = false;
      EMAIL_FIELDS.forEach(function(ef) {
        var email = (record[ef.field] || "").trim();
        var name = ef.nameField ? (record[ef.nameField] || "").trim() : "";
        var available = email.length > 0;
        if (available) anyAvailable = true;
        emailEntries.push({
          email: email,
          role: ef.role,
          name: name,
          available: available
        });
      });

      if (!anyAvailable) {
        alert("Smart Compose\n\nNo email addresses found on this record in the configured fields.");
        return;
      }

      buildSelectionModal(emailEntries);
    });
  }

  // ============================================================
  // Build the email selection modal
  // ============================================================
  function buildSelectionModal(entries) {
    var overlay = document.createElement("div");
    overlay.id = "kai-modal-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center";

    var box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:12px;padding:24px;width:440px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:-apple-system,system-ui,sans-serif;font-size:14px";
    box.innerHTML = '<div style="font-size:18px;font-weight:700;margin-bottom:4px;color:#1a1a1a">&#x1F4E7; Smart Compose</div>';
    box.innerHTML += '<div style="font-size:13px;color:#666;margin-bottom:16px">Select recipients and routing.</div>';

    var recordId = getRecordId();
    var moduleName = getModuleName();

    entries.forEach(function(entry) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;padding:8px 10px;border-radius:6px;margin-bottom:4px;border:1px solid #e9ecef;background:#f8f9fa";
      if (!entry.available) row.style.opacity = "0.4";

      var rowHtml = '';
      if (entry.available) {
        rowHtml += '<input type="checkbox" checked style="margin-right:10px;cursor:pointer;width:16px;height:16px" class="kai-cb">';
      } else {
        rowHtml += '<input type="checkbox" disabled style="margin-right:10px;cursor:not-allowed;width:16px;height:16px">';
      }
      rowHtml += '<div style="flex:1;min-width:0">';
      rowHtml += '<div style="font-weight:600;font-size:13px;color:#333">' + entry.role + '</div>';
      rowHtml += '<div style="font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">';
      if (entry.available) {
        rowHtml += entry.email + (entry.name ? ' &mdash; ' + entry.name : '');
      } else {
        rowHtml += 'No email on record';
      }
      rowHtml += '</div></div>';
      if (entry.available) {
        rowHtml += '<select class="kai-route" style="font-size:11px;color:#1976d2;border:1px solid #ccc;background:#fff;border-radius:3px;padding:2px 4px;cursor:pointer">';
        rowHtml += '<option value="to">To</option><option value="cc">Cc</option><option value="bcc">Bcc</option>';
        rowHtml += '</select>';
      }
      row.innerHTML = rowHtml;
      box.appendChild(row);
    });

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #e9ecef";
    btnRow.innerHTML = '<button id="kai-cancel-btn" style="padding:8px 18px;font-size:13px;font-weight:500;border:none;border-radius:6px;cursor:pointer;background:#e9ecef;color:#333">Cancel</button>';
    btnRow.innerHTML += '<button id="kai-send-btn" style="padding:8px 18px;font-size:13px;font-weight:500;border:none;border-radius:6px;cursor:pointer;background:#1976d2;color:#fff">Open Email Composer</button>';
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("kai-cancel-btn").addEventListener("click", function() {
      closeModal(overlay);
    });

    document.getElementById("kai-send-btn").addEventListener("click", function() {
      handleSend(overlay, recordId, moduleName);
    });
  }

  // ============================================================
  // Handle send
  // ============================================================
  function handleSend(overlay, recordId, moduleName) {
    var toList = [];
    var ccList = [];
    var bccList = [];

    var rows = overlay.firstChild.querySelectorAll('div[style*="display:flex"]');
    rows.forEach(function(row) {
      if (row.nodeType !== 1) return;
      var cb = row.querySelector('.kai-cb');
      if (!cb || !cb.checked) return;

      var select = row.querySelector('.kai-route');
      if (!select) return;

      var infoDiv = row.querySelector('div[style*="flex:1"]');
      if (!infoDiv) return;

      var emailText = "";
      var emailDiv = infoDiv.children[1];
      if (emailDiv) {
        var text = emailDiv.textContent || emailDiv.innerText || "";
        var parts = text.split("&mdash;");
        emailText = parts[0].trim();
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

    // Open native email composer
    try {
      if (typeof ZDK !== "undefined" && ZDK.Email && typeof ZDK.Email.compose === "function") {
        ZDK.Email.compose({
          to: toList.join(","),
          cc: ccList.join(","),
          bcc: bccList.join(",")
        });
        return;
      }
    } catch (e) {
      console.warn("SmartCompose: ZDK.Email.compose failed:", e);
    }

    // Fallback: URL-based email compose
    var url = "/crm/EntityInfo.do?module=" + moduleName + "&id=" + recordId + "&actionType=SendEmail" +
      "&to=" + encodeURIComponent(toList.join(",")) +
      "&cc=" + encodeURIComponent(ccList.join(","));
    window.open(url, "_blank", "width=800,height=600");
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
  // Boot
  // ============================================================
  if (document.readyState === "complete" || document.readyState === "interactive") {
    injectButton();
  } else {
    document.addEventListener("DOMContentLoaded", injectButton);
  }

})();