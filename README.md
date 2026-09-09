# PTS-FlightApp
Flight Details and Precision Timing Schedule (PTS) - Interactive web application for flight operations management

## Transfer to an iPad without file uploads

1. Open the published app on both devices: https://jackyyouyang-commits.github.io/PTS-FlightApp/PTS_FlightApp.html
2. On the laptop, fill in the flight and operational tabs, then select **Connect**.
3. On the iPad, select **Connect > Scan QR Code to Connect**, allow camera access, and point the camera at the laptop's QR code. Use the scanner inside this app, not the iPad Camera app.
4. Keep scanning the automatically cycling codes until **Flight Data Successfully Retrieved** appears. Missing parts are picked up on the next cycle; duplicates and out-of-order parts are supported.

QR Connect uses the implementation from commit `43e25dc`. The transfer includes Flight Info, PTS actual times, all operational text tabs, rich formatting, pasted images, and imported PDFs. Data is imported only after the complete sequence passes its integrity check. A single QR is used when the complete payload fits; otherwise the laptop cycles through numbered 700-character parts every 1.1 seconds. Images and PDFs can require many parts and longer scanning time.

No file picker, download, upload, or account is required for QR transfer. The iPad must permit camera access to the HTTPS app; the app cannot override company device restrictions. Select **Save** on the iPad after retrieval to save immediately. The later complete-flight ten-minute autosave and save-before-suspension behavior remain in place.
