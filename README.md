# Bucharest-GTFS-Exporter
Generate GTFS files for transportation modes in Bucharest - STB Bus, Trolleybus, Tram &amp; Metrorex subway. Probably regional bus operators will be soon accessible by this method too.

You need NodeJS v8+ and npm 3+.
- Clone the repo to your computer, switch to its directory, install the dependencies and run.
```sh
$ git clone https://github.com/BodoMinea/Bucharest-GTFS-Exporter.git
$ cd Bucharest-GTFS-Exporter
$ npm install
$ node .
```

It will take a while to run. Randomized artificial delays are introduced in between requests in order to not flood the InfoSTB app servers and defeat potential anti-scrape measures. This whole process took 25 minutes on a Desktop computer with i7 processor and 8gb RAM, with it running from the command line and being the only user process on at that time.

This can be viewed in the [Schedule Viewer that Google provides](https://github.com/google/transitfeed):
![Screenshot](screen1.png "Screenshot")
![Screenshot](screen2.png "Screenshot")
![Screenshot](screen3.png "Screenshot")

This is a work in progress, please see the attached [Validation Report](https://bodominea.github.io/Bucharest-GTFS-Exporter/validation-results.html). I'm still not sure which ones are project bugs and which are actually bad data entered by the Municipality in the app.
