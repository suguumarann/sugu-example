import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM
import joblib
import gc

def load_data(stock_id, folder_path='public/eod_myx', time_step=60):
    all_files = sorted([f for f in os.listdir(folder_path) if f.endswith('.csv')])
    data = []

    for file in all_files:
        try:
            date_from_filename = pd.to_datetime(file.split(".")[0], format='%Y%m%d')
            df = pd.read_csv(os.path.join(folder_path, file))
            stock_data = df[df['Ticker'] == stock_id]
            
            if not stock_data.empty:
                stock_data['Date'] = date_from_filename
                data.append(stock_data[['Price', 'Date']])

            # Clear the dataframe for the current file after processing
            del df
            gc.collect()

        except pd.errors.ParserError:
            print(f"Error reading file {file}. Skipping this file.")
            continue

    if not data:
        return None, None, None

    data = pd.concat(data).sort_values('Date')
    close_prices = data['Price'].values.reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(close_prices)

    X_train, y_train = [], []
    for i in range(time_step, len(scaled_prices)):
        X_train.append(scaled_prices[i - time_step:i, 0])
        y_train.append(scaled_prices[i, 0])

    if len(X_train) == 0:
        print(f"Insufficient data for stock ID '{stock_id}'. Skipping.")
        return None, None, None

    X_train, y_train = np.array(X_train), np.array(y_train)
    X_train = np.reshape(X_train, (X_train.shape[0], X_train.shape[1], 1))

    return X_train, y_train, scaler

def build_and_train_model(X_train, y_train):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], 1)))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dense(units=25))
    model.add(Dense(units=1))

    model.compile(optimizer='adam', loss='mean_squared_error')
    model.fit(X_train, y_train, batch_size=32, epochs=10, verbose=0)
    return model

if __name__ == "__main__":
    folder_path = 'public/eod_myx'
    model_save_dir = 'public/models'
    os.makedirs(model_save_dir, exist_ok=True)

    all_stock_ids = set()
    for file in os.listdir(folder_path):
        if file.endswith('.csv'):
            df = pd.read_csv(os.path.join(folder_path, file))
            all_stock_ids.update(df['Ticker'].unique())
            del df  # Free memory after reading file
            gc.collect()

    for stock_id in all_stock_ids:
        model_save_path = os.path.join(model_save_dir, f"{stock_id}_model")
        scaler_save_path = os.path.join(model_save_dir, f"{stock_id}_scaler.pkl")

        # Check if the model and scaler already exist
        if os.path.exists(model_save_path) and os.path.exists(scaler_save_path):
            print(f"Model and scaler for stock ID '{stock_id}' already exist. Skipping.")
            continue

        print(f"Processing stock: {stock_id}")
        X_train, y_train, scaler = load_data(stock_id, folder_path)

        if X_train is None or y_train is None:
            print(f"No sufficient data for stock ID '{stock_id}'. Skipping.")
            continue

        model = build_and_train_model(X_train, y_train)

        # Save the model
        model.save(model_save_path)
        print(f"Model saved for stock ID: {stock_id} at {model_save_path}")

        # Save the scaler for future use in prediction
        joblib.dump(scaler, scaler_save_path)
        print(f"Scaler saved for stock ID: {stock_id} at {scaler_save_path}")

        # Clear memory after processing each stock
        del X_train, y_train, scaler, model
        gc.collect()

