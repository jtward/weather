$(function() {
	var toRadians = Math.PI / 180;

	var description = document.getElementById("main").getElementsByClassName("description")[0];
	var subtext = document.getElementById("main").getElementsByClassName("subtext")[0];
	var temperature = document.getElementById("temp-container").getElementsByClassName("description")[0];
	
	var locations;
	var location;
	var position;

	var scrollPosition = 0;

	var touch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
    var transformProperty = (function() {
        var temp = document.createElement('weather');
        var props = ['transform', 'webkitTransform', 'mozTransform'];
        var prop;
        var i = 0;
        for(; i < 3; i += 1) {
            prop = props[i];
            if (temp.style[prop] !== undefined) {
                return prop;
            }
        }
    }());

	var statuses = {
		gettingLocation: {
			i: '',
			d: "Getting your location.",
			s: "Give it a fucking second."
		},
		loading: {
			i: '',
			d: "Getting data.",
			s: "Give it a fucking second."
		},
		geoDenied: {
			i: '',
			d: "Location permission was <span class=\"red\">denied</span>!",
			s: "Allow geolocation to get the fucking weather."
		},
		noLocation: {
			i: '',
			d: "Couldn't locate you.",
			s: "Just fucking look outside, maybe?"
		},
		noGeoSupport: {
			i: '',
			d: "Location is not supported!",
			s: "Use a modern fucking browser."
		},
		noConnection: {
			i: '',
			d: "No fucking connection!",
			s: "Connect to the internet already!"
		},
		networkError: {
			i: '',
			d: "Network error!",
			s: "Something's up with the connection"
		},
		network3xx4xx: {
			i: '',
			d: "Something went wrong.",
			s: "I can only apologize. Fuck."
		},
		network5xx: {
			i: '',
			d: "The server fucked up.",
			s: "I can only apologize."
		},
		dark: {
			i: '',
			d: "It's fucking dark.",
			s: "Nothing to see here."
		},
		freezing: {
			i: '',
			d: "It's fucking <span class=\"span\">freezing</span>.",
			s: "Pile on the layers."
		},
		cold: {
			i: '',
			d: "It's <span class=\"blue\">cold</span>.",
			s: "Wear a fucking coat or something."
		},
		chilly: {
			i: '',
			d: "It's a bit fucking <span class=\"blue\">chilly</span>.",
			s: "Wear a jumper."
		},
		average: {
			i: '',
			d: "It's pretty fucking average.",
			s: "Nothing to write home about."
		},
		nice: {
			i: '',
			d: "It's not actually too bad.",
			s: "You could totally fucking go outside."
		},
		cloudy: {
			i: '',
			d: "Just fucking <span class=\"grey\">grey</span>.",
			s: "That's pretty much it."
		},
		warmCloudy: {
			i: '',
			d: "It's would be <span class=\"green\">nice</span>...",
			s: "If it weren't for the fucking clouds."
		},
		glorious: {
			i: '',
			d: "It's fucking <span class=\"yellow\">glorious</span>.",
			s: "Get the fuck outside."
		},
		hot: {
			i: '',
			d: "It's <span class=\"red\">hot</span> and <span class=\"yellow\">sunny</span>.",
			s: "What more do you fucking want?"
		},
		scorching: {
			i: '',
			d: "It's <span class=\"red\">scorching</span>.",
			s: "Get in the fucking shade."
		},
		rain: {
			i: '',
			d: "It's fucking <span class=\"blue\">raining</span>.",
			s: "You can look outside for more information."
		},
		heavyRain: {
			i: '',
			d: "It's fucking <span class=\"blue\">tipping it down</span>.",
			s: "You're probably going to get wet."
		},
		sleet: {
			i: '',
			d: "It's trying to fucking <span class=\"grey\">snow</span>.",
			s: "Close enough."
		},
		hail: {
			i: '',
			d: "Fucking <span class=\"blue\">hailstones</span>",
			s: "Those things can fucking hurt."
		},
		snow: {
			i: '',
			d: "It's fucking <span class=\"grey\">snowing</span>.",
			s: "Fingers crossed it settles."
		},
		heavySnow: {
			i: '',
			d: "It's fucking <span class=\"grey\">snowing</span>.",
			s: "Go throw some at other people or something."
		},
		thunder: {
			i: '',
			d: "Fucking <span class=\"yellow\">thunder storms</span>!",
			s: "My favourite."
		}

	};

	window.applyStatus = function(status) {
		status = statuses[status];
		description.innerHTML = status.d;
		subtext.innerHTML = status.s;
	};

	var ajaxFail = function(xhr, textStatus, errorThrown) {
		if(xhr.status === 0) {
			if(typeof navigator.onLine === "boolean" && !navigator.onLine) {
				applyStatus("noConnection");
			}
			else {
				applyStatus("networkError");
			}
		}
		else if (xhr.status >= 300 && xhr.status < 500) {
			applyStatus("network3xx4xx");
		}
		else if (xhr.status > 500) {
			applyStatus("network5xx");
		}
	};

	if (navigator.geolocation) {
		applyStatus("gettingLocation");
		navigator.geolocation.getCurrentPosition(function success(pos) {
			applyStatus("loading");
			position = {
				latitude: toRadians * pos.coords.latitude,
				longitude: toRadians * pos.coords.longitude
			};

			if (locations) {
				fetchWeather();
			}
		}, function error(positionError) {
			if (positionError.code === 1) { // denied
				applyStatus("geoDenied");
			}
			else { // unavailable or timeout
				applyStatus("noLocation");
			}
		}, {
			enableHighAccuracy: false,
			timeout: 5000,
			maximumAge: 10800000 // 6 hours
		});
	}
	else {
		applyStatus("noGeoSupport");
	}

	$.ajax({
		url: "http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/sitelist?res=3hourly&key=b7cd3cb8-a58c-43c5-a27a-7befd3637e06",
		type: "GET",
		dataType: "jsonp",
		crossDomain: true
	}).done(function(data, status, xhr) {
		if(data && data.Locations && data.Locations.Location) {
			locations = data.Locations.Location;
		}

		if (position) {
			fetchWeather();
		}
	}).fail(ajaxFail);

	var fetchWeather = function() {
		var i, l, d, dmin, loc, lat, lng, x, y;
		dmin = Infinity;
		if (!location) {
			l = locations.length;
			for(i = 0; i < l; i += 1) {
				loc = locations[i];
				lat = toRadians * loc.latitude;
				lng = toRadians * loc.longitude;
				x = (lng - position.longitude) * Math.cos((lat + position.latitude) / 2);
				y = (lat-position.latitude);
				d = Math.sqrt(x*x + y*y);
				if (d < dmin) {
					dmin = d;
					location = loc.id;
				}
			}
		}

		$.ajax({
			url: "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/" + location + "?res=3hourly&key=b7cd3cb8-a58c-43c5-a27a-7befd3637e06",
			type: "GET",
			dataType: "jsonp",
			crossDomain: true
		}).done(function(data, status, xhr) {
			var forecastPoints = data.SiteRep.DV.Location.Period[0].Rep;
			var forecastPoint;
			var timeNow = new Date();
			var i, l = forecastPoints.length;
			timeNow = 60 * timeNow.getHours() + timeNow.getMinutes();

			for(i = 0; i < l; i += 1) {
				if (!forecastPoint ||
					Math.abs(timeNow - forecastPoints[i].$) < Math.abs(timeNow - forecastPoint.$)) {
					forecastPoint = forecastPoints[i];
				}
			}

			temperature.innerHTML = forecastPoint.F + "&deg;C";

			if (forecastPoint.W === 0 || forecastPoint.W === 2) {
				
				if (forecastPoint.F <= 4) {
					applyStatus("freezing");
				}
				else if (forecastPoint.F <= 8) {
					applyStatus("cold");
				}
				else {
					applyStatus("dark");
				}
			}
			else if (forecastPoint.W < 9) {
				if (forecastPoint.F > 32) {
					applyStatus("scorching");
				}
				else if (forecastPoint.F > 26) {
					applyStatus("hot");
				}
				else if (forecastPoint.F > 18) {
					if (forecastPoint.W === 1) {
						applyStatus("glorious");
					}
					else if(forecastPoint.W === 3) {
						applyStatus("warm");
					}
					else {
						applyStatus("warmCloudy");
					}
				}
				else if (forecastPoint.F > 12) {
					if (forecastPoint.W === 1) {
						applyStatus("nice");
					}
					else if(forecastPoint.W === 3) {
						applyStatus("average");
					}
					else {
						applyStatus("cloudy");
					}
				}
				else if (forecastPoint.F > 8) {
					applyStatus("chilly");
				}
				else if (forecastPoint.F > 4) {
					applyStatus("cold");
				}
				else {
					applyStatus("freezing");
				}
			}
			else if(forecastPoint.W < 13) {
				applyStatus("rain");
			}
			else if(forecastPoint.W < 16) {
				applyStatus("heavyRain");
			}
			else if(forecastPoint.W < 19) {
				applyStatus("sleet");
			}
			else if(forecastPoint.W < 22) {
				applyStatus("hail");
			}
			else if(forecastPoint.W < 25) {
				applyStatus("snow");
			}
			else if(forecastPoint.W < 28) {
				applyStatus("heavySnow");
			}
			else {
				applyStatus("thunder");
			}

		}).fail(ajaxFail);
	}


	var initialTouchX;
    var initialTouchY;
    var isBeingTouched;
    var lastTouchTime;
    var lastTouchSpeed;
    var lastTouchX;
    var initialX = 0;
    var currentX = 0;
    var lastdx;
    var slideSpeed = 300;
    var animateStartTime;
    var animateDuration;
    var animateStart;

    var timeNow = function() { 
   		return Date.now();
   	};

    var background = document.getElementById("swipe");
	var children = Array.prototype.slice.call(document.getElementsByClassName("swipe-item"));
	var N = children.length;

	var updatePositions = function() {
		var w = document.documentElement.offsetWidth;
        var el;
        var n;
        for (n = 0; n < N; n += 1) {
            el = children[n];
            var x = (n * w) + currentX;
            el.style[transformProperty] = 'translateX(' + x + 'px) translateZ(1px)';
        }
    };

    var touchstart = function(event) {
        var touch;
        if (event.touches.length > 1 || event.scale && event.scale !== 1) {
            if (isBeingTouched) {
                touchend();
            }
            return;
        }

        // record the X and Y positions of the touch relative to the page so that we
        // can determine whether the user is trying to scroll or use the carousel
        touch = event.touches[0];

        initialTouchX = touch.pageX;
        initialTouchY = touch.pageY;
        initialX = currentX;

        isBeingTouched = true;
        lastdx = 0;
        lastTouchSpeed = 0;
        lastTouchTime = timeNow();

        // add event listeners
        background.addEventListener("touchmove", checkScroll, false);
        background.addEventListener("touchend", touchend, false);
        background.addEventListener("touchcancel", touchend, false);
        background.addEventListener("touchleave", touchend, false);
    };

    var checkScroll = function(event) {
        var touch = event.touches[0];

        if (Math.abs(initialTouchX - touch.pageX) < Math.abs(initialTouchY - touch.pageY)) {
            touchend();
            return;
        }

        // use the "real" move listener from now on
        background.removeEventListener("touchmove", checkScroll, false);
        background.addEventListener("touchmove", touchmove, false);

        // do a touchmove right now!
        touchmove(event);
    };

    var touchmove = function(event) {
    	var w = document.documentElement.offsetWidth;

        var touch = event.touches[0];
        var dx = touch.pageX - initialTouchX;
        var now = timeNow();

        currentX = initialX + dx;

        lastTouchSpeed = (dx-lastdx) / (now - lastTouchTime);

        lastdx = dx;
        lastTouchTime = now;

        var maxX = 0;
        var minX = -1 * (N - 1) * w;
        if (currentX < minX) {
            currentX = minX;
            lastTouchSpeed = 0;
        }
        else if (currentX > maxX) {
        	currentX = maxX;
            lastTouchSpeed = 0;
        }

        updatePositions();

        // don't scroll
        event.preventDefault();
    };

    var touchend = function(event) {

    	var w = document.documentElement.offsetWidth;


        isBeingTouched = false;
        background.removeEventListener("touchmove", checkScroll, false);
        background.removeEventListener("touchmove", touchmove, false);
        background.removeEventListener("touchend", touchend, false);
        background.removeEventListener("touchcancel", touchend, false);
        background.removeEventListener("touchleave", touchend, false);

        animateStartTime = Date.now();
        animateDuration = slideSpeed;
        animateStart = currentX;

		if (lastTouchSpeed < 0) {
            animateEnd = w * Math.floor(currentX / w);
        }
        else {
            animateEnd = w * Math.ceil(currentX / w);
        }

        window.requestAnimationFrame(animate);
    };

    var animate = function() {
        var now, animationTime;

        if (isBeingTouched) {
            return;
        }

        // what fraction through the animation are we?
        animationTime = (Date.now() - animateStartTime) / animateDuration;
        if (animationTime >= 1) {
            currentX = animateEnd;
        }
        else {
            currentX = animateStart + animationTime * (animateEnd - animateStart);
        }
        updatePositions();
        if (animationTime < 1) {
            window.requestAnimationFrame(animate);
        }
    };

    background.addEventListener("touchstart", touchstart, false);

    window.onresize = updatePositions;

    updatePositions();
});