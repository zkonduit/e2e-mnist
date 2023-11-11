"use client";
import { useState } from "react";
import styles from "./WalletConnector.module.scss";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { Button } from "../button/Button";
import cn from "classnames";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { InjectedConnector } from "wagmi/connectors/injected";

export default function WalletConnector({ small = false, className = "" }) {
  const [loading, setLoading] = useState(false);
  const { connectAsync, connectors } = useConnect();
  const { isConnected, isConnecting } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const onConnectToWalletConnect = async () => {
    try {
      setLoading(true);
      console.log(connectors);
      const { account } = await connectAsync({
        connector: connectors.find((x) => x instanceof WalletConnectConnector),
      });
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const onDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectAsync();
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  return (
    <div className={cn(styles.container, className)}>
      {!isConnected && (
        <Button
          small={small}
          className={styles.button}
          text="Connect Wallet"
          loading={loading || isConnecting}
          loadingText={"Connecting..."}
          onClick={onConnectToWalletConnect}
        />
      )}
      {isConnected && (
        <Button
          small={small}
          className={styles.button}
          text="Disconnect Wallet"
          loading={loading}
          loadingText={"Disconnecting..."}
          onClick={onDisconnect}
        />
      )}
    </div>
  );
}
