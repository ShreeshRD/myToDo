import React from "react";
import { Box } from '@mui/material';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import DateComponent from "../DateComponent";
import './header.scss'

function Header({ darkmode, useDate, setDate, viewPage }) {
	return (
		<div className={`myheader${darkmode ? ' dark' : ''}`}>
			<div className="headerItem">
				<h1>
					<b>{viewPage}</b>
				</h1>
			</div>
			<div className="headerItem">
				{setDate.name !== "dummySetDate" && (
					<Box display="flex" alignItems="center">
						<IoIosArrowBack className="date-btns" onClick={() => setDate((prevDate) => prevDate.subtract(7, 'day'))} />
						<DateComponent selectedDate={useDate} handler={(newDate) => setDate(newDate)} darkmode={darkmode} />
						<IoIosArrowForward className="date-btns" onClick={() => setDate((prevDate) => prevDate.add(7, 'day'))} />
					</Box>
				)}
			</div>
			<div className="headerItem">
				<h1><b>{useDate.format('MMMM')}</b></h1>
			</div>
		</div>
	);
}

export default Header;
