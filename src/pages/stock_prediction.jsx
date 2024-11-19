import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockDetails } from '../utils/web-service'; // Import the fetchStockDetails function
import './stock_prediction.css';

export default function StockPrediction() {
    const { stockId } = useParams();
    const [predictionData, setPredictionData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Preparing the prediction graph...");
    const [selectedTimeframe, setSelectedTimeframe] = useState(8); // Default is 1 Week (8 days)
    const [stockDetails, setStockDetails] = useState({}); // State for stock details

    const timeframes = [
        { label: '1 Week', days: 8 },
        { label: '2 Weeks', days: 15 },
        { label: '1 Month', days: 31 },
        { label: '2 Months', days: 61 },
    ];

    useEffect(() => {
        const messages = [
            "Preparing the prediction graph...",
            "Collecting data for the graph...",
            "Analyzing the stock trends...",
            "Plotting the graph, this may take a while...",
        ];
        let messageIndex = 0;

        const interval = setInterval(() => {
            if (messageIndex < messages.length) {
                setLoadingMessage(messages[messageIndex]);
                messageIndex++;
            }
        }, 3000); // Change message every 3 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    useEffect(() => {
        const fetchPredictionData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/predict/${stockId}`);
                
                if (!response.ok) {
                    console.error('No prediction data available for this stock.');
                    setPredictionData([]);
                    return;
                }

                const data = await response.json();
                setPredictionData(data.predictions || []);
            } catch (error) {
                console.error('Error fetching prediction data:', error);
                setPredictionData([]);
            }
            setLoading(false);
        };

        fetchPredictionData();
    }, [stockId]);

    useEffect(() => {
        const fetchDetails = async () => {
            const details = await fetchStockDetails(stockId); // Fetch stock details
            setStockDetails(details || {}); // Set the stock details or an empty object if no data
        };

        fetchDetails();
    }, [stockId]);

    const filteredPredictionData = predictionData.slice(0, selectedTimeframe);

    const stockNews = stockDetails
    ? [
        `Current Price: ${stockDetails.price} ${stockDetails.currency || ''}.`,
        `Today's Open: ${stockDetails.open}, High: ${stockDetails.high}, Low: ${stockDetails.low}.`,
        `Volume: ${stockDetails.volume}, Change: ${stockDetails.change} (${stockDetails.changePercent}%).`,
        `Average True Range (ATR-14): ${stockDetails.atr14}.`,
        `Market Capitalization: ${stockDetails.marketCap}.`,
        `Sector: ${stockDetails.sector}, Industry: ${stockDetails.industry}.`,
        `Type: ${stockDetails.type}, Sub-Type: ${stockDetails.subType}.`,
        `Price Scale: ${stockDetails.priceScale}, Minimum Movement: ${stockDetails.minMov}.`,
    ].filter(Boolean)
    : ["No details available for the selected stock."];


    if (loading) {
        return (
            <div className="loading-overlay" style={{
                backgroundImage: `url('https://images.pexels.com/photos/14708425/pexels-photo-14708425.jpeg?auto=compress&cs=tinysrgb&w=600')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                width: '100%',
                height: '100%',
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: '9999',
            }}>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-message">{loadingMessage}</p>
                    <div className="loading-progress-bar">
                        <div className="progress" style={{ animation: "progressBarAnimation 20s linear" }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="prediction-page" style={{
                backgroundImage: `url('https://images.pexels.com/photos/14708425/pexels-photo-14708425.jpeg?auto=compress&cs=tinysrgb&w=600')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                width: '100%',
                height: '100%',
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: '9999',
            }}>
            <h2>Stock Prediction for {stockId}</h2>

            {/* Timeframe Selector Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
                {timeframes.map((timeframe) => (
                    <button
                        key={timeframe.days}
                        className={`timeframe-button ${selectedTimeframe === timeframe.days ? 'active' : ''}`}
                        onClick={() => setSelectedTimeframe(timeframe.days)}
                    >
                        {timeframe.label}
                    </button>
                ))}
            </div>

            {filteredPredictionData.length > 0 ? (
                <ResponsiveContainer width="60%" height={440}>
                    <LineChart data={filteredPredictionData}>
                        <defs>
                            <linearGradient id="predictionGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#007bff" />
                                <stop offset="100%" stopColor="#00d2ff" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#333" />
                        <XAxis dataKey="date" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#333333',
                                borderRadius: '10px',
                                color: '#ffffff',
                            }}
                            wrapperStyle={{
                                border: "2px #C0C0C0 solid",
                                outline: "none",
                                backgroundColor: '#333333',
                                borderRadius: '10px',
                                padding: '0px',
                                boxShadow: 'inset 0 0 0 1px #606060, 0 2px 8px rgba(0, 0, 0, 0.3)', // Inset border effect
                            }}
                        />
                        <Line type="monotone" dataKey="predictedPrice" stroke="url(#predictionGradient)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <p className="no-prediction-message">
        No prediction data available for this stock.
    </p>
            )}

            {/* News ticker at the bottom */}
            <div className="news-ticker">
                <div className="ticker-wrapper">
                    <div className="ticker-content">
                        {stockNews.map((news, index) => (
                            <span key={index} className="ticker-item">{news}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
