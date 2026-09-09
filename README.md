# PTS-FlightApp
Flight Details and Precision Timing Schedule (PTS) - Interactive web application for flight operations management

## Transfer to an iPad without file uploads

1. Open the published app on both devices: https://jackyyouyang-commits.github.io/PTS-FlightApp/PTS_FlightApp.html
2. On the laptop, fill in the flight and operational tabs, then select **Connect**.
3. On the iPad, select **Connect > Scan QR Code to Connect**, allow camera access, and point the camera at the laptop's QR code. Use the scanner inside this app, not the iPad Camera app.
4. Keep scanning the automatically cycling codes until **Flight Data Successfully Retrieved** appears. Missing parts are picked up on the next cycle; duplicates and out-of-order parts are supported.

The transfer includes Flight Info, PTS actual times, all operational text tabs, rich formatting, pasted images, and imported PDFs. Data is imported only after the complete sequence passes its integrity check, then immediately saved on the receiving device. A single QR is used when the complete payload is small enough; larger payloads use multiple camera-friendly frames. Images and PDFs can require many parts and longer scanning time.

No file picker, download, upload, or account is required for QR transfer. The iPad must permit camera access to the HTTPS app; the app cannot override company device restrictions. If local storage is blocked or full, the app displays **Flight Data Retrieved - Not Saved** rather than implying the data is safely stored. Keep the page open and retry **Save** once storage is available.
