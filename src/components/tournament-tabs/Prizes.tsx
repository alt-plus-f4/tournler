interface PrizesProps {
	prizePool: number;
}

const Prizes: React.FC<PrizesProps> = ({ prizePool }) => {
	return (
		<div>
			<div className='flex justify-between items-center mt-6 ml-1'>
				<h1 className='text-2xl font-bold mb-2 ml-1'>Prize Pool</h1>
			</div>
			<div className='border p-4 mt-2 mb-8'>
				<div className='flex justify-between mb-2 border-b p-2 mt-2'>
					<p>1st</p>
					<p className='text-sm'>$ {(prizePool * 0.5).toFixed(2)}</p>
				</div>
				<div className='flex justify-between mb-2 border-b p-2'>
					<p>2nd</p>
					<p className='text-sm'>$ {(prizePool * 0.3).toFixed(2)}</p>
				</div>
				<div className='flex justify-between p-2'>
					<p>3rd</p>
					<p className='text-sm'>$ {(prizePool * 0.2).toFixed(2)}</p>
				</div>
			</div>
		</div>
	);
};

export default Prizes;
