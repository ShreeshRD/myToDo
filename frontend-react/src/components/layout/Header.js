import React from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Button, Box } from '@mui/material';
import './header.css'

function Header({ darkmode, useDate, setDate, viewPage }) {
	return (
		<div className={`myheader${darkmode ? ' dark' : ''}`}>
			<div className="headerItem">
				<h1>
					<b>{viewPage}</b>
				</h1>
			</div>
			<div className="headerItem">
				{setDate.name !== "dummySetDate" && (<LocalizationProvider dateAdapter={AdapterDayjs}>
					<Box display="flex" alignItems="center">
						<Button variant="outlined" onClick={() => setDate((prevDate) => prevDate.subtract(7, 'day'))}>{`<`}</Button>
						<DatePicker
							label=""
							defaultValue={dayjs()}
							value={useDate}
							onChange={(newDate) => setDate(newDate)}
						/>
						<Button variant="outlined" onClick={() => setDate((prevDate) => prevDate.add(7, 'day'))}>{`>`}</Button>
					</Box>
				</LocalizationProvider>)}
			</div>
			<div className="headerItem">
				<h1><b>{useDate.format('MMMM')}</b></h1>
			</div>
		</div>
	);
}

export default Header;
