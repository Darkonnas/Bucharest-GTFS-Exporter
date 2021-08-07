const fs = require('fs'),
    polyline = require('polyline-encoded'),
    request = require('sync-request');

const util = require('util')

const apiURL = "https://info.stbsa.ro", hasMetroLines = true;

const currentService = "LV";

const start = new Date();

let data = {
    "agency": [
        "agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_fare_url,agency_email",
        "1,STB SA,https://stbsa.ro,Europe/Bucharest,ro,0213110595,http://stbsa.ro/portofel_electronic.php,contact@stbsa.ro",
        "2,METROREX SA,http://www.metrorex.ro/,Europe/Bucharest,ro,0213193601,http://www.metrorex.ro/titluri_de_calatorie_p1381-1,contact@metrorex.ro"
    ],
    "stops": [
        "stop_id,stop_name,stop_desc,stop_lat,stop_lon"
    ],
    "routes": [
        "route_id,agency_id,route_short_name,route_type,route_color,route_text_color,route_long_name"
    ],
    "trips": [
        "route_id,service_id,trip_id,trip_headsign,direction_id,shape_id"
    ],
    "stop_times": [
        "trip_id,arrival_time,departure_time,stop_id,stop_sequence"
    ],
    "shapes": [
        "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence"
    ],
    "calendar": [
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
        "LV,1,1,1,1,1,0,0,20200301,20201230",
        "SD,0,0,0,0,0,1,1,20200301,20201230"
    ],
    "calendar_dates": [
        "service_id,date,exception_type"
    ]
};

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function blockWait() {
    const waitTill = new Date(new Date().getTime() + randomIntFromInterval(1200, 3100));
    while (waitTill > new Date()) {}
}

function zip(arrays) {
    if (arrays && arrays[0]) return arrays[0].map(function (_, i) {
        return arrays.map(function (array) {
            return array[i]
        })
    });
    else return [];
}

function stopInList(id) {
    for (let i = 0; i < data.stops.length; i++) {
        if (data.stops[i].split(',')[0] == id) return true;
    }
    return false;
}

function agencyInList(id) {
    for (let i = 0; i < data.agency.length; i++) {
        if (data.agency[i].split(',')[0] == id) return true;
    }
    return false;
}

function processLineDirection(res2, id, dir, hs, sn) {
    blockWait();
    console.log("Line, direction: " + id + ", " + dir + " - " + hs);

    let temp = [], seqs = [];

    if (res2.stops) {
        for (let i = 0; i < res2.stops.length; i++) {
            if (!stopInList(res2.stops[i].id)) {
                data.stops.push(res2.stops[i].id + ',"' + res2.stops[i].name + '","' + res2.stops[i].description + '",' + res2.stops[i].lat + "," + res2.stops[i].lng);
            }

            let res;
            let repeat = true;

            while (repeat) {
                repeat = false;
                try {
                    res = request('GET', apiURL + '/rp/api/lines/' + id + '/stops/' + res2.stops[i].id);
                    res = JSON.parse(res.getBody('utf8'));
                } catch (err) {
                    blockWait();
                    repeat = true;
                }
            }

            if (res[0].lines[0] && res[0].lines[0].timetable)
                for (let j = 0; j < res[0].lines[0].timetable.length; j++) {
                    for (let k = 0; k < res[0].lines[0].timetable[j].minutes.length; k++) {
                        temp.push("," + res[0].lines[0].timetable[j].hour + ":" + res[0].lines[0].timetable[j].minutes[k] + ":00," + res[0].lines[0].timetable[j].hour + ":" + res[0].lines[0].timetable[j].minutes[k] + ":30" + "," + res2.stops[i].id + "," + i);
                    }
                }
        }
    }

    for (let i = 0; i < temp.length; i++) {
        if (!seqs[temp[i].split(',')[4]]) seqs[temp[i].split(',')[4]] = [temp[i]];
        else seqs[temp[i].split(',')[4]].push(temp[i]);
    }

    temp = zip(seqs);

    if (temp) {
        for (let i = 0; i < temp.length; i++) {
            data.trips.push(id + "," + currentService + "," + `TRIP_${currentService}_${id}_${dir}_${i}` + ',"' + hs + '",' + dir + ',' + id + dir);

            let last = '';
            const max = (hasMetroLines && sn.indexOf("M") !== -1) ? (temp[i].length) : (temp[i].length - 1);

            if (temp[i]) {
                for (let j = 0; j < max; j++) {
                    if (temp[i][j]) {
                        linex = temp[i][j].split(',');
                        lline = last.split(',');
                        if (lline[1] == linex[1]) {
                            explode_arrival = linex[1].split(":");
                            explode_departure = linex[2].split(":");

                            explode_arrival[2] = parseInt(explode_arrival[2]) + 20;
                            explode_departure[2] = parseInt(explode_departure[2]) + 20;

                            linex[1] = explode_arrival.join(":");
                            linex[2] = explode_departure.join(":");

                            temp[i][j] = linex.join(",");

                        } else if (lline[1] > linex[1]) {
                            explode_arrival = linex[1].split(":");
                            explode_departure = linex[2].split(":");

                            explode_arrival[0] = parseInt(explode_arrival[0]) + 24;
                            explode_departure[0] = parseInt(explode_departure[0]) + 24;

                            linex[1] = explode_arrival.join(":");
                            linex[2] = explode_departure.join(":");

                            temp[i][j] = linex.join(",");

                        }
                        last = temp[i][j];
                        data.stop_times.push(`TRIP_${currentService}_${id}_${dir}_${i}` + temp[i][j]);
                    }
                }
            }
        }
    }
}

function addShapes(linestring, id) {
    let line = polyline.decode(linestring);

    for (let i = 0; i < line.length; i++) {
        data.shapes.push(id + "," + line[i][0] + "," + line[i][1] + "," + i);
    }

}

function processLine(id) {
    console.log("Line: " + id);

    let res;
    let repeat = true;

    while (repeat) {
        repeat = false;
        try {
            res = request('GET', apiURL + '/rp/api/lines/' + id + '/direction/0');
            res = JSON.parse(res.getBody('utf8'));
        } catch (err) {
            blockWait();
            repeat = true;
        }
    }

    let type;

    switch (res.type) {
        case "TRAM":
            type = 0;
            break;
        case "BUS":
            type = 3;
            break;
        case "CABLE_CAR":
            type = 11;
            break;
        case "SUBWAY":
            type = 1;
            break;
        default:
            type = 3;
    }

    data.routes.push(res.id + "," + res.organization.id + "," + res.name + "," + type + "," + res.color.replace("#", "") + ",ffffff,");

    addShapes(res.segment_path, id + "0");
    processLineDirection(res, id, 0, res.direction_name_tur, res.name);

    repeat = true;

    while (repeat) {
        repeat = false;
        try {
            res = request('GET', apiURL + '/rp/api/lines/' + id + '/direction/1');
            res = JSON.parse(res.getBody('utf8'));
        } catch (err) {
            blockWait();
            repeat = true;
        }
    }

    addShapes(res.segment_path, id + "1");
    processLineDirection(res, id, 1, res.direction_name_retur, res.name);
}

gdata = request('GET', apiURL + '/rp/api/lines/');
gdata = JSON.parse(gdata.getBody('utf8'));

for (let i = 0; i < gdata.lines.length; i++) {
    if (!agencyInList(gdata.lines[i].organization.id)) {
        console.log("Adding agency from API, ID: " + gdata.lines[i].organization.id);
        data.agency.push(gdata.lines[i].organization.id.toString());
    }
    processLine(gdata.lines[i].id);
}

function msToHMS(ms) {
    let seconds = ms / 1000;
    const hours = parseInt(seconds / 3600);
    seconds = seconds % 3600;
    const minutes = parseInt(seconds / 60);
    seconds = seconds % 60;
    return (hours + ":" + minutes);
}

dirn = `${start.getTime()} (București-${currentService})`;

if (!fs.existsSync("./output/" + dirn)) {
    console.log("Creating output subdirectory " + dirn);
    fs.mkdirSync("./output/" + dirn);
}

for (let property in data) {
    fs.writeFileSync("./output/" + dirn + "/" + property + ".txt", data[property].join("\r\n"));
}

now = new Date();

console.log("Started at: " + start);
console.log("Ended at: " + now);
console.log("Duration: " + msToHMS(now - start));
