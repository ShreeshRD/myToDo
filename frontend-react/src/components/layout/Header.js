import React from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

function Header({ darkmode, useDate, setDate, viewPage }) {
	return (
		<div className={`myheader${darkmode ? ' dark' : ''}`}>
			<div className="headerItem">
				<h1>
					<b>{viewPage}</b>
				</h1>
				{setDate.name !== "dummySetDate" && (<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DatePicker
						label=""
						defaultValue={dayjs()}
						value={useDate}
						onChange={(newDate) => setDate(newDate)}
					/>
				</LocalizationProvider>)}
			</div>
			<div className="headerItem">
				<h1><b>{useDate.format('MMMM')}</b></h1>
			</div>
		</div>
	);
}

export default Header;
