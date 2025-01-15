interface PrizesProps {
   prizePool: number;
}

const Prizes: React.FC<PrizesProps> = ({prizePool}) => {
    const prizeData = [
        { place: 1, amount: 1000 },
        { place: 2, amount: 500 },
        { place: 3, amount: 250 },
    ];

    console.log(prizePool);

    return (
        <div className='mt-6'>
            <h2 className='text-xl font-bold mb-4'>Prizes</h2>
            <ul className='space-y-2'>
                {prizeData.map((prize) => (
                    <li key={prize.place} className='border p-2 rounded'>
                        {`Place ${prize.place}: $${prize.amount}`}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Prizes;