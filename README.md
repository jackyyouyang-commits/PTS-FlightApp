# PTS-FlightApp
Flight Details and Precision Timing Schedule (PTS) - Interactive web application for flight operations management

## v1.22 beta: larger whole-flight QR with Normal / Fast cycling

Open the **Fast QR beta on both devices**: https://jackyyouyang-commits.github.io/PTS-FlightApp/beta/PTS_FlightApp.html

This is a new **whole-flight** experiment, not the deleted per-tab beta. Stable v1.22 is unchanged. In beta, select **Connect**, then choose **Normal (1.1 seconds/QR)** or **Fast (0.5 seconds/QR)** on the laptop. Normal is the default on each page load. The QR grows to at most 480px where the viewport permits and shrinks on small screens; the dialog scrolls to keep controls reachable. On the other device, use **Scan QR Code to Connect**.

Speed changes affect only the outgoing timer: the current frame, complete payload, transfer ID and collected receiver parts stay unchanged. One QR remains static in either mode. The dialog shows the actual part count and selected-mode **minimum full cycle**. For 1,000 parts, Normal takes at least **18m 20s**, Fast **8m 20s** per cycle. Missed frames require extra cycles, and Fast may miss more; no physical iPad speed improvement has been measured. Enlarging the QR does **not** reduce the part count.

The stable complete-flight protocol, 650-character parts, integrity checks, viewing-copy quality, every image/PDF page, and all flight/schedule import and auto-field behavior are retained. Flight data travels in QR images only: no backend upload or device-to-device network transfer. Loading the app/PDF.js may require internet access; content is processed locally.

Fast QR beta uses a new isolated storage namespace, distinct from both stable and the deleted per-tab beta. To seed it without re-entering a laptop flight, **Save** in stable, then open beta **Connect > Whole-flight beta help / copy saved stable flight > Copy saved flight from stable v1.22**. Confirm replacement of the entire beta flight. This explicitly reads a detached copy of stable's complete snapshot, without changing stable or falling back to stale standalone fields. The existing local transfer-file import/export is also available.

Its separate PWA identity and beta-scoped worker use only Fast QR beta caches, never an old per-tab cache or stable cache. Open online once to replace an old beta worker and install this experiment's offline assets. The unchanged stable worker can evict other caches on a future activation; reopen beta online if its offline cache is lost. PDF viewing-copy preparation may still need PDF.js online; the original-attachment fallback remains explicit.

## Import a downloaded transfer file on iPad

In **Connect**, select **Download Transfer File** to save one compressed `*-PTS-Connect.txt` file containing the complete flight and original attachments. Move it to the iPad using a company-approved method, then choose **Save to Files** and select a folder such as **Downloads**. In the app, use **Connect > Upload Transfer File** (or **Read Transfer File Locally** in beta) to select it. This reads the file on the device; it does not upload flight data to a server.

Existing `.pts` files remain compatible. The picker no longer filters by extension or MIME type, which can grey out custom file types on iPad; the importer still checks the PTS transfer contents and rejects unrelated files. New downloads use the standard `.txt` extension and `text/plain` type without changing the compressed format. Renaming an unrelated document does not make it a PTS transfer file. Company restrictions on Safari accessing a file or its storage provider can still prevent selection.

## Transfer to an iPad without file uploads

1. Open the published app on both devices: https://jackyyouyang-commits.github.io/PTS-FlightApp/PTS_FlightApp.html
2. On the laptop, fill in the flight and operational tabs, then select **Connect**. Wait while the app prepares smaller, readable attachment copies and calculates the QR sequence.
3. On the iPad, select **Connect > Scan QR Code to Connect**, allow camera access, and point the camera at the laptop's QR code. Use the scanner inside this app, not the iPad Camera app.
4. Keep scanning the automatically cycling codes until **Flight Data Successfully Retrieved** appears. Missing parts are picked up on the next cycle; duplicates and out-of-order parts are supported.

The transfer includes Flight Info, PTS actual times, all operational text tabs, rich formatting, pasted images, and imported PDFs. Data is imported only after the complete sequence passes its integrity check, then saved immediately on the receiving device. It remains compatible with the single- and multi-part QR formats introduced in `43e25dc`.

**A single QR is intentionally static.** When all current data fits in 650 compressed characters, the status reads **QR 1 of 1**. Larger payloads automatically cycle through 650-character parts every 1.1 seconds, with the same 320px QR display. Parts are chunks of the complete flight, not one QR per tab.

**QR transfer uses viewing copies, not smaller desktop originals.** Plain text, table data and rich formatting are preserved; no tab, image or PDF page is discarded or cropped. Suitable images are reduced to at most 1600 pixels wide (long screenshots retain their full height at that scale). Opaque images may use JPEG quality 0.8; transparent images retain transparency, and vector/animated images remain intact. PDFs are rebuilt as readable page images with every page and its aspect ratio preserved; these PDF viewing copies do not retain selectable/searchable text. All processing is on the sending device. PDF rendering uses the app's existing PDF.js loader and may need internet access to load that library, but flight content is not uploaded. Desktop attachments and saved state are unchanged.

The dialog compares original and outgoing payload sizes and shows the outgoing QR part count and **minimum full-cycle time**. For source payloads up to 8 MB, it also compares original QR part counts and keeps the smaller complete sequence; larger source payloads skip that extra compression pass to limit memory use. Allow additional cycles for missed scans: for example, 1,000 parts require at least **18 minutes 20 seconds per cycle** and can still take much longer to receive completely. This is not an instant transfer. Individual attachments are kept unchanged when their viewing copies would be larger. If preparation fails, the dialog names the failed attachment and offers an explicit **Use original attachments (slower)** fallback; nothing is silently omitted. Closing the dialog or switching to the scanner cancels preparation.

The Connect dialog shows how many operational tabs on this device contain content. If it says no flight data is loaded, populate the laptop app before sending, or use the scanner on the receiving device. The laptop only displays the QR and does not need camera access. Cancelling scanning or encountering a camera error returns to the outgoing QR display and resumes any multi-part sequence.

No file picker, download, upload, or account is required for QR transfer. The iPad must permit camera access to the HTTPS app; the app cannot override company device restrictions. If storage is full or blocked, **Flight Data Retrieved - Not Saved** warns that the received flight is not yet saved; keep the page open and retry **Save** when storage is available. Complete-flight ten-minute autosave and save-before-suspension remain in place.
