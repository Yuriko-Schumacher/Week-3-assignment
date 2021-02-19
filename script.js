// contains the full timeilne
const yearSVG = d3.select("svg.year");
const yearSize = { w: 300, h: 500 };
const yearMargin = { t: 20, r: 40, b: 40, l: 60 };
const yearG = yearSVG.append("g").classed("year-container", true);
yearSVG.attr("width", yearSize.w).attr("height", yearSize.h);

// contains the detailed bar chart
const mapSVG = d3.select("svg.map");
const mapSize = { w: 800, h: 500 };
const mapG = mapSVG.append("g").classed("map-container", true);
mapSVG.attr("width", mapSize.w).attr("height", mapSize.h);

const bubblesG = mapSVG.append("g").classed("bubbles", true);

const dropdown = document.getElementById("genre");

let data,
	netflixData,
	mapData,
	filter = [];
let xScale, yScale, colorScale;
let barBrush, projection, path, pathSel;
let xAxis,
	yAxis,
	xAxisLabel,
	yAxisLabel,
	shouldMakeVerticalGrid = true,
	genres,
	selectedOption;

Promise.all([
	d3.csv("data/netflix_cleaned.csv"),
	d3.json("data/map/world.geo.json"),
]).then(function (datasets) {
	netflixData = datasets[0];
	mapData = datasets[1];
	console.log(netflixData);
	console.log(mapData);

	populateGenres();
	setupBrush();
	drawBars();
	drawMap();
	colorMap();

	d3.select("#genre").on("change", function () {
		updateDataByDropdown();
	});
});

function populateGenres() {
	let genre1 = netflixData.map((el) => el.genre1);
	let genre2 = netflixData.map((el) => el.genre2);
	let genre3 = netflixData.map((el) => el.genre3);
	genres = genre1.concat(genre2, genre3);
	genres = [...new Set(genres)];

	let genresTv = genres.filter((el) => el.split(" ").includes("TV"));
	let genresMovie = genres.filter((el) => el.split(" ").includes("Movies"));
	let genresOther = genres
		.filter((genre) => genresTv.indexOf(genre) == -1)
		.filter((genre) => genresMovie.indexOf(genre) == -1)
		.filter((genre) => genre !== "NA");

	let options = ["Movies", "TV Shows", "Other"];
	options.forEach((option) => {
		let optGroup = document.createElement("optgroup");
		optGroup.label = option;
		optGroup.id = option;
		dropdown.add(optGroup);
	});

	let optGroup = document.getElementsByTagName("optgroup");

	addOptions(0, genresMovie);
	addOptions(1, genresTv);
	addOptions(2, genresOther);

	function addOptions(optIndex, genres) {
		genres.forEach((genre) => {
			optGroup[optIndex].appendChild(new Option(genre, genre));
		});
	}
}

function setupBrush(data = netflixData) {
	barBrush = d3
		.brushY()
		.extent([
			[yearMargin.l, yearMargin.t],
			[yearSize.w - yearMargin.r, yearSize.h - yearMargin.b],
		])
		.on("end", function (event) {
			if (!event.selection) return;
			let step = yScale.step();
			let lowerIndex = Math.floor(
				(event.selection[0] - yearMargin.t) / step
			);
			let lowerVal = yScale.domain()[lowerIndex];
			let upperIndex = Math.floor(
				(event.selection[1] - yearMargin.t) / step
			);
			let upperVal =
				upperIndex >= yScale.domain().length
					? yScale.domain()[yScale.domain().length - 1]
					: yScale.domain()[upperIndex];
			filter = [lowerVal, upperVal];
			updateDataByBrush();
		});
	yearSVG.call(barBrush);
}

function updateDataByBrush(filteredData) {
	let selectedOption = dropdown.value;
	filteredData = netflixData;
	if (selectedOption === "all") {
		filteredData = netflixData;
		if (filter.length > 0) {
			filteredData = filteredData.filter((d) => {
				return (
					+d.releaseYear >= filter[0] && +d.releaseYear <= filter[1]
				);
			});
		}
	} else {
		filteredData = filteredData.filter((d) => {
			return (
				d.genre1 === selectedOption ||
				d.genre2 === selectedOption ||
				d.genre3 === selectedOption
			);
		});
		if (filter.length > 0) {
			filteredData = filteredData.filter((d) => {
				return (
					+d.releaseYear >= filter[0] && +d.releaseYear <= filter[1]
				);
			});
		}
	}
	drawBars(filteredData);
	colorMap(filteredData);
}

function updateDataByDropdown(filteredData) {
	let selectedOption = dropdown.value;
	console.log(selectedOption);
	if (filter.length > 0) {
		filteredData = netflixData.filter((d) => {
			return +d.releaseYear >= filter[0] && +d.releaseYear <= filter[1];
		});
		if (selectedOption !== "all") {
			filteredData = filteredData.filter((d) => {
				return (
					d.genre1 === selectedOption ||
					d.genre2 === selectedOption ||
					d.genre3 === selectedOption
				);
			});
		}
	} else {
		filteredData = netflixData;
		if (selectedOption !== "all") {
			filteredData = filteredData.filter((d) => {
				return (
					d.genre1 === selectedOption ||
					d.genre2 === selectedOption ||
					d.genre3 === selectedOption
				);
			});
		}
	}
	console.log(filteredData);
	drawBars(filteredData);
	colorMap(filteredData);
}

function drawBars(data = netflixData) {
	data = d3.group(data, (d) => +d.releaseYear);
	data = Array.from(data);
	data = data.sort(function (a, b) {
		return a[0] - b[0];
	});

	let years = data.map((d) => d[0]);

	if (!xScale) {
		xScale = d3
			.scaleLinear()
			.domain(d3.extent(data, (d) => d[1].length))
			.range([yearMargin.l, yearSize.w - yearMargin.r]);
	}

	if (!yScale) {
		yScale = d3
			.scaleBand()
			.padding(0.3)
			.domain(years)
			.range([yearMargin.t, yearSize.h - yearMargin.b]);
	}

	let xValues = [200, 400, 600, 800, 1000];
	if (shouldMakeVerticalGrid) {
		xValues.forEach((value) => drawVerticalGrid(value));
		shouldMakeVerticalGrid = false;
	}

	if (!xAxis) {
		xAxis = yearG
			.append("g")
			.attr("class", "axis")
			.attr("transform", `translate(0,${yearSize.h - yearMargin.b})`)
			.call(d3.axisBottom().scale(xScale).ticks(5));
	}

	if (!yAxis) {
		yAxis = yearG
			.append("g")
			.attr("class", "axis")
			.attr("transform", `translate(${yearMargin.l},0)`)
			.call(
				d3
					.axisLeft()
					.scale(yScale)
					.tickValues(
						yScale.domain().filter((d) => {
							return +d % 5 === 0;
						})
					)
			);
	}

	// xAxisLabel = yearG
	// 	.append("text")
	// 	.attr("class", "axis-label")
	// 	.attr("x", yearSize.w / 2)
	// 	.attr("y", yearSize.h)
	// 	.text("Releases");

	// yAxisLabel = yearG
	// 	.append("text")
	// 	.attr("class", "axis-label")
	// 	.attr("transform", "rotate(-90)")
	// 	.attr("x", -yearSize.h / 2)
	// 	.attr("y", yearMargin.l / 3)
	// 	.text("Year");

	let bars = yearG
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("width", (d) => xScale(d[1].length) - yearMargin.l)
		.attr("height", yScale.bandwidth())
		.attr("x", (d) => xScale(0))
		.attr("y", (d) => yScale(d[0]))
		.attr("fill", "#e30715")
		.attr("fill-opacity", ".8")
		.attr("stroke", "#e30715")
		.attr("stroke-width", ".4");
}

function drawVerticalGrid(xValue) {
	yearG
		.append("line")
		.classed("grid", true)
		.attr("x1", xScale(xValue))
		.attr("y1", yearMargin.t)
		.attr("x2", xScale(xValue))
		.attr("y2", yearSize.h - yearMargin.b);
}

function drawMap() {
	projection = d3.geoMercator().fitSize([mapSize.w, mapSize.h], mapData);
	path = d3.geoPath(projection);
	pathSel = mapG
		.selectAll("path")
		.data(mapData.features)
		.enter()
		.append("path")
		.attr("country", (d) => d.properties.brk_name)
		.attr("d", (d) => path(d));
}

function colorMap(data = netflixData) {
	let country1 = d3.group(data, (d) => d.country1);
	country1 = Array.from(country1);
	let country2 = d3.group(data, (d) => d.country2);
	country2 = Array.from(country2);
	let country3 = d3.group(data, (d) => d.country3);
	country3 = Array.from(country3);
	let countries = country1.concat(country2, country3);

	let dataForMap = {};
	dataForMap.country = countries
		.map((el) => el[0])
		.filter((el) => el != "NA");
	dataForMap.country = [...new Set(dataForMap.country)];
	dataForMap.count = dataForMap.country.map((country) => {
		let thisCountry = countries.filter((el) => el[0] === country);
		return thisCountry
			.map((el) => el[1].length)
			.reduce((sum, el) => {
				return sum + el;
			}, 0);
	});

	colorScale = d3
		.scaleSequential()
		.domain(d3.extent(dataForMap.count))
		.interpolator(d3.interpolateRgb("gray", "#e30715"));

	console.log(dataForMap);

	pathSel.style("fill", function (d) {
		let countryName = d.properties.brk_name;
		let countryIndex = dataForMap.country.findIndex(
			(el) => el === countryName
		);
		return colorScale(dataForMap.count[countryIndex]);
	});
}
