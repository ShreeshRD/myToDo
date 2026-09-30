'use client'

import React from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import DateComponent from "./DateComponent";
import Heatmap from "./Heatmap";
import '../styles/header.scss'

function Header({ theme, useDate, setDate, viewPage }) {
	const isCalendar = viewPage === 'Calendar';
	const showDateNav = !isCalendar && setDate.name !== "dummySetDate";

	return (
		<header className={`myheader ${theme}`}>
			<div className="headerItem headerTitle">
				<h1>{viewPage}</h1>
				<span className="headerSubtitle">{useDate.format('MMMM YYYY')}</span>
			</div>
			{isCalendar && (
				<div className="headerItem headerCenter">
					<Heatmap currentDate={useDate} />
				</div>
			)}
			<div className="headerItem headerActions">
				{isCalendar && (
					<>
						<button className="date-btns" aria-label="Previous month" onClick={() => setDate((prevDate) => prevDate.subtract(1, 'month'))}>
							<IoIosArrowBack />
						</button>
						<button className="date-btns" aria-label="Next month" onClick={() => setDate((prevDate) => prevDate.add(1, 'month'))}>
							<IoIosArrowForward />
						</button>
					</>
				)}
				{showDateNav && (
					<>
						<button className="date-btns" aria-label="Previous week" onClick={() => setDate((prevDate) => prevDate.subtract(7, 'day'))}>
							<IoIosArrowBack />
						</button>
						<DateComponent selectedDate={useDate} handler={(newDate) => setDate(newDate)} theme={theme} location="header" />
						<button className="date-btns" aria-label="Next week" onClick={() => setDate((prevDate) => prevDate.add(7, 'day'))}>
							<IoIosArrowForward />
						</button>
					</>
				)}
			</div>
		</header>
	);
}

export default Header;
