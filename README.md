# PTS-FlightApp
Flight Details and Precision Timing Schedule (PTS) - Interactive web application for flight operations management

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
