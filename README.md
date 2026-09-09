# PTS-FlightApp
Flight Details and Precision Timing Schedule (PTS) - Interactive web application for flight operations management

## Transfer to an iPad without file uploads

1. Open the published app on both devices: https://jackyyouyang-commits.github.io/PTS-FlightApp/PTS_FlightApp.html
2. On the laptop, fill in the flight and operational tabs, then select **Connect**.
3. On the iPad, select **Connect > Scan QR Code to Connect**, allow camera access, and point the camera at the laptop's QR code. Use the scanner inside this app, not the iPad Camera app.
4. Keep scanning the automatically cycling codes until **Flight Data Successfully Retrieved** appears. Missing parts are picked up on the next cycle; duplicates and out-of-order parts are supported.

The transfer includes Flight Info, PTS actual times, all operational text tabs, rich formatting, pasted images, and imported PDFs. Data is imported only after the complete sequence passes its integrity check, then saved immediately on the receiving device. It remains compatible with the single- and multi-part QR formats introduced in `43e25dc`.

**A single QR is intentionally static.** When all current data fits in 700 compressed characters, the status reads **QR 1 of 1**. Larger payloads automatically cycle through 700-character parts every 1.1 seconds. Parts are chunks of the complete flight, not one QR per tab. Images and PDFs can require many parts and longer scanning time.

The Connect dialog shows how many operational tabs on this device contain content. If it says no flight data is loaded, populate the laptop app before sending, or use the scanner on the receiving device. The laptop only displays the QR and does not need camera access. Cancelling scanning or encountering a camera error returns to the outgoing QR display and resumes any multi-part sequence.

No file picker, download, upload, or account is required for QR transfer. The iPad must permit camera access to the HTTPS app; the app cannot override company device restrictions. If storage is full or blocked, **Flight Data Retrieved - Not Saved** warns that the received flight is not yet saved; keep the page open and retry **Save** when storage is available. Complete-flight ten-minute autosave and save-before-suspension remain in place.
