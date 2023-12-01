import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface BarGraphProps {
    data: number[];
}

const BarGraph: React.FC<BarGraphProps> = ({ data }) => {
    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
            },
        },
    };

    const labels = Array.from({ length: 10 }, (_, i) => i.toString());

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Digit Submissions',
                data: data,
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
        ],
    };

    return <Bar options={options} data={chartData} />;
};

export default BarGraph;
