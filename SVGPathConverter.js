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


function browseArrayItem(item) {
  //console.log(item);
  var obj = item, counter, newPath;
  for (var i in item) {
    if (typeof(item[i]) === "object") {
      //going on step down in the object tree!!
      if(i === "g") {
        if (item[i] instanceof Array) {
          var newObj = [];
          for(counter in item[i]) {
            newObj.push(browseArrayItem(item[i][counter]));
          }
          obj.g = newObj;
        } else {
          obj.g = browseArrayItem(item[i]);
        }

      }

      if(i === "line") {
        if(obj.path === undefined) {
          obj.path = [];
        }
        if (item[i] instanceof Array) {
          for(counter in item[i]) {
            newPath = transformLineToPath(item[i][counter]);
            obj.path.push(newPath);
          }
        } else {
          newPath = transformLineToPath(item[i]);
          obj.path.push(newPath);
        }
        delete obj.line;
      }

      if(i === "ellipse") {
        if(obj.path === undefined) {
          obj.path = [];
        }
        if (item[i] instanceof Array) {
          for(counter in item[i]) {
            newPath = transformEllipseToPath(item[i][counter]);
            obj.path.push(newPath);
          }
        } else {
          newPath = transformEllipseToPath(item[i]);
          obj.path.push(newPath);
        }
        delete obj.ellipse;
      }

      if(i === "circle") {
        if(obj.path === undefined) {
          obj.path = [];
        }
        if (item[i] instanceof Array) {
          for(counter in item[i]) {
            newPath = transformCircleToPath(item[i][counter]);
            obj.path.push(newPath);
          }
        } else {
          newPath = transformCircleToPath(item[i]);
          obj.path.push(newPath);
        }
        delete obj.circle;
      }

      if(i === "polyline") {
        if(obj.path === undefined) {
          obj.path = [];
        }
        if (item[i] instanceof Array) {
          for(counter in item[i]) {
            newPath =  transformPolylineToPath(item[i][counter]);
            obj.path.push(newPath);
          }
        } else {
          newPath = transformPolylineToPath(item[i]);
          obj.path.push(newPath);
        }
        delete obj.polyline;
      }

      if(i === "rect") {
        // TODO
        //if(obj.path === undefined) {
          //obj.path = [];
        //}
        //if(obj.path instanceof Object) {
          //current = obj.path;
          //obj.path = [];
          //obj.path.push(current);
        //}
        //if (item[i] instanceof Array) {
          //for(counter in item[i]) {
            //newPath =  transformRectToPath(item[i][counter]);
            //obj.path.push(newPath);
          //}
        //} else {
          //newPath = transformRectToPath(item[i]);
          //obj.path.push(newPath);
        //}
        //delete obj.rect;
      }

    }
  }
  return obj;
}

function processSvgFile(element) {
  fs.readFile(element, 'utf-8', function(err, data) {

    parsedSvgFile = xm.tojson(data);
    if(parsedSvgFile.svg === undefined)
      return;

    var result = browseArrayItem(parsedSvgFile.svg);

    // Fix a bug where we must force root tag to be a <svg>
    var tmp = { svg :result};
    //console.log(util.inspect(tmp, false, null));
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

function transformLineToPath(element) {
  var newElement = {};
  newElement.debug = 'modified-line';
  newElement.d = 'M' + element.x1 + ',' + element.y1 + 'L' + element.x2 + ',' + element.y2;
  if(element.stroke)
    newElement.stroke = element.stroke;
  if(element.fill)
    newElement.fill = element.fill;

  return newElement;
}

function transformRectToPath(element) {
  var newElement = {};
  newElement.debug = 'modified-rect';
  return newElement;
}

function transformPolylineToPath(element) {
  var newElement = {};
  newElement.debug = 'modified-polyline';
  var points = element.points.split(' ');
  var path = "M" + points[0];
  for(var i = 1; i < points.length; i++) {
    path += "L"+points[i];
  }
  newElement.d = path;

  if(element.stroke)
    newElement.stroke = element.stroke;
  if(element.fill)
    newElement.fill = element.fill;

  return newElement;
}

function transformEllipseToPath(element) {
  var startX = element.cx - element.rx,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.rx),
      endY = element.cy;

  var newElement = {};
  newElement.debug = 'modified-ellipse';
  newElement.d = "M" + startX + "," + startY +
                 "A" + element.rx + "," + element.ry + " 0,1,1 " + endX + "," + endY +
                 "A" + element.rx + "," + element.ry + " 0,1,1 " + startX + "," + endY;

  if(element.stroke)
    newElement.stroke = element.stroke;
  if(element.fill)
    newElement.fill = element.fill;
  if(element.transform)
    newElement.transform = element.transform;

  return newElement;
}

function transformCircleToPath(element, index, array) {
  var newElement = {};
  var startX = element.cx - element.r,
      startY = element.cy;
  var endX = parseFloat(element.cx) + parseFloat(element.r),
      endY = element.cy;
  newElement.debug = 'modified-ellipse';
  newElement.d = "M" + startX + "," + startY +
              "A" + element.r + "," + element.r + " 0,1,1 " + endX + "," + endY +
              "A" + element.r + "," + element.r + " 0,1,1 " + startX + "," + endY;

  if(element.stroke)
    newElement.stroke = element.stroke;
  if(element.fill)
    newElement.fill = element.fill;

  return newElement;
}


function usage() {
  console.log(" usage : node SVGPathConverter.js [file|folder]");
}
