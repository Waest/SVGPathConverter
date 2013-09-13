module.exports = svgPathConverter;

var svgPathConverter  = {};

var fs = require('fs'),
    util = require('util'),
    xm = require('xml-mapping'),
    glob = require('glob'),
    parsedSvgFile = {},
    path = process.argv.slice(2)[0];

// Basic argument check
if(path === undefined) {
  usage();
  process.exit(0);
}

fs.stat(path, function(err, stats) {
  if(err) {
    console.error('cannot open : ' + path);
    process.exit(1);
  }

  if(stats.isDirectory()) {
    glob(path + "/**/*.svg", {}, function (err, files) {
      files.forEach(processSvgFile);
    });
  } else {
    processSvgFile(path);
  }
});

function processSvgFile(element, index, array) {
  fs.readFile(element, 'utf-8', function(err, data) {
    // TODO : What should we do ?
    //if(err) {
    //console.error(err[0]);
    //return;
    //}

    parsedSvgFile = xm.tojson(data);
    if(parsedSvgFile.svg === undefined)
      return;

    var lines = parsedSvgFile.svg.line;
    var polylines = parsedSvgFile.svg.polyline;
    var ellipses = parsedSvgFile.svg.ellipse;
    var circles = parsedSvgFile.svg.circle;

    // Processing lines
    if(lines) {
      if(lines.constructor.name === "Array") {
        lines.forEach(transformLineToPath);
      } else {
        transformLineToPath(lines);
      }

      delete parsedSvgFile.svg.line;
    }

    // Processing polylines
    if(polylines) {
      if(polylines.constructor.name === "Array") {
        polylines.forEach(transformPolylineToPath);
      } else {
        transformPolylineToPath(polylines);
      }

      delete parsedSvgFile.svg.polyline;
    }

    // Processing ellipse
    if(ellipses) {
      if(ellipses.constructor.name === "Array") {
        ellipses.forEach(transformEllipseToPath);
      } else {
        transformEllipseToPath(ellipses);
      }

      delete parsedSvgFile.svg.ellipse;
    }

    // Processin circle
    if(circles) {
      if(circles.constructor.name === "Array") {
        polylines.forEach(transformCircleToPath);
      } else {
        transformCircleToPath(circles);
      }

      delete parsedSvgFile.svg.circle;
    }

    // Fix a bug where we must force root tag to be a <svg>
    var tmp = { svg : parsedSvgFile.svg};
    var content = '<?xml version="1.0" encoding="utf-8"?>';
    content += xm.toxml(tmp);

    var optimizedContent = content.replace(/(\r\n|\n|\r|\t)/gm,"");
    optimizedContent = optimizedContent.replace(/>/gm, ">\r\n");

    fs.writeFile(element, optimizedContent, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("File " + element + " updated!");
      }
    });
  });

}

function transformLineToPath(element, index, array) {
  // Adds d path
  element.class = 'modified-line';
  element.d = 'M' + element.x1 + ',' + element.y1 + 'L' + element.x2 + ',' + element.y2;

  // Remove useless attributes
  delete element.x1;
  delete element.y1;
  delete element.x2;
  delete element.y2;

  parsedSvgFile.svg.path.push(element);
}

function transformPolylineToPath(element, index, array) {
  element.class = 'modified-polyline';
  var points = element.points.split(' ');
  var path = "M" + points[0];
  for(var i = 1; i < points.length; i++) {
    path += "L"+points[i];
  }
  element.d = path;

  // Remove useless attributes
  delete element.points;

  parsedSvgFile.svg.path.push(element);
}

function transformEllipseToPath(element, index, array) {
  var startX = element.cx - element.rx,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.rx),
      endY = element.cy;
  element.class = 'modified-ellipse';
  element.d = "M" + startX + "," + startY +
              "A" + element.rx + "," + element.ry + " 0,1,1 " + endX + "," + endY +
              "A" + element.rx + "," + element.ry + " 0,1,1 " + startX + "," + endY;

  // Remove useless attributes
  delete element.cx;
  delete element.cy;
  delete element.rx;
  delete element.ry;

  parsedSvgFile.svg.path.push(element);
}

function transformCircleToPath(element, index, array) {
  var startX = element.cx - element.r,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.r),
      endY = element.cy;
  element.class = 'modified-ellipse';
  element.d = "M" + startX + "," + startY +
              "A" + element.r + "," + element.r + " 0,1,1 " + endX + "," + endY +
              "A" + element.r + "," + element.r + " 0,1,1 " + startX + "," + endY;

  // Remove useless attributes
  delete element.cx;
  delete element.cy;
  delete element.r;

  parsedSvgFile.svg.path.push(element);
}


function usage() {
  console.log(" usage : node SVGPathConverter.js [file|folder]");
}
