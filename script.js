// contains the full timeilne
const yearSVG = d3.select("svg.year");
const yearSize = { w: 800, h: 200 };
const yearMargin = { t: 20, r: 20, b: 40, l: 60 };
const yearG = yearSVG.append("g").classed("year-container", true);
yearSVG.attr("width", yearSize.w).attr("height", yearSize.h);

// contains the detailed bar chart
const mapSVG = d3.select("svg.map");
const mapSize = { w: 800, h: 600 };
const mapG = mapSVG.append("g").classed("map-container", true);
mapSVG.attr("width", mapSize.w).attr("height", mapSize.h);

const dropdown = d3.select("select");

let netflixData, mapData;
let xScale, yScale, projection, colorScale;
let xAxis, yAxis, xAxisLabel, yAxisLabel, genres;

Promise.all([d3.csv("data/netflix_cleaned.csv")]).then(function (datasets) {
	netflixData = datasets;
	console.log(netflixData);

	// populate genre dropdown
	let genre1 = netflixData[0].map((el) => el.genre1);
	let genre2 = netflixData[0].map((el) => el.genre2);
	let genre3 = netflixData[0].map((el) => el.genre3);
	genres = genre1.concat(genre2).concat(genre3);
	genres = [...new Set(genres)];

	// Bar chart //
	drawBars();
});

function drawBars(data = netflixData) {
	data = d3.group(data[0], (d) => +d.releaseYear);
	data = Array.from(data);
	data = data.sort(function (a, b) {
		return a[0] - b[0];
	});
	let years = data.map((d) => d[0]);

	xScale = d3
		.scaleBand()
		.padding(0.3)
		.domain(years)
		.range([yearMargin.l, yearSize.w - yearMargin.r]);

	yScale = d3
		.scaleLinear()
		.domain(d3.extent(data, (d) => d[1].length))
		.range([yearSize.h - yearMargin.b, yearMargin.t]);

	xAxis = yearSVG
		.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(0,${yearSize.h - yearMargin.b})`)
		.call(
			d3
				.axisBottom()
				.scale(xScale)
				.tickValues(
					xScale.domain().filter((d) => {
						return +d % 10 === 0;
					})
				)
		);

	yAxis = yearSVG
		.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(${yearMargin.l},0)`)
		.call(d3.axisLeft().scale(yScale).ticks(5));

	yearG
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("width", xScale.bandwidth())
		.attr("height", (d) => yearSize.h - yearMargin.b - yScale(d[1].length))
		.attr("x", (d) => xScale(d[0]))
		.attr("y", (d) => yScale(d[1].length))
		.attr("fill", "#e30715")
		.attr("fill-opacity", ".8")
		.attr("stroke", "#e30715")
		.attr("stroke-width", ".4");

	xAxisLabel = yearSVG
		.append("text")
		.attr("class", "axis-label")
		.attr("x", yearSize.w / 2)
		.attr("y", yearSize.h)
		.text("Year");

	yAxisLabel = yearSVG
		.append("text")
		.attr("class", "axis-label")
		.attr("transform", "rotate(-90)")
		.attr("x", -yearSize.h / 2)
		.attr("y", yearMargin.l / 3)
		.text("Releases");
}
