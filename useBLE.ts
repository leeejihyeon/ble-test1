import {useMemo, useState} from "react";
import {PermissionsAndroid, Platform} from "react-native";
import {BleManager, Device} from "react-native-ble-plx";
import * as ExpoDevice from "react-native-device-info";

export const bleManager = new BleManager();

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<Boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectToDevice: (deviceId: Device) => Promise<void>;
}

function useBLE(): BluetoothLowEnergyApi {

    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

    console.log('connectedDevice : ', connectedDevice);

    const requestAndroid31Permissions = async () => {
        const bluetoothScanPermissions = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "스캔 권한",
                message: "이 앱은 블루투스 장치를 스캔하는 권한이 필요합니다. 권한을 허용해 주세요.",
                buttonPositive: "확인"
            }
        );

        console.log('bluetoothScanPermissions : ', bluetoothScanPermissions);

        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "스캔 권한",
                message: "이 앱은 블루투스 장치에 연결하는 기능을 사용하기 위해 필요한 권한을 요청합니다. 권한을 허용해 주세요.",
                buttonPositive: "확인",
            }
        );

        console.log('bluetoothConnectPermission : ', bluetoothConnectPermission);

        const bluetoothFineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "정밀한 위치 정보",
                message: "이 앱은 정밀한 위치 정보를 사용하기 위해 필요한 권한을 요청합니다. 권한을 허용해 주세요.",
                buttonPositive: "확인",
            }
        );

        return (
            bluetoothScanPermissions === "granted" &&
            bluetoothConnectPermission === "granted" &&
            bluetoothFineLocationPermission === "granted"
        );
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            console.log('11111');
            // @ts-ignore
            if ((await ExpoDevice.getApiLevel() ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "위치 정보 권한",
                        message: "블루투스 기능을 사용하기 위해 위치 정보 권한이 필요합니다. 권한을 허용해 주세요.",
                        buttonPositive: "확인"
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                return await requestAndroid31Permissions();
            }
        } else {
            return true;
        }
    };

    // 실제 스캔 및 중복 확인
    const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const scanForPeripherals = () => {

        const serviceUUIDs = ["FDA50693-A4E2-4FB1-AFCF-C6EB07647825"];  // 원하는 UUID를 이곳에 입력하세요.
        console.log('serviceUUIDs:  ', serviceUUIDs);

        // bleManager.startDeviceScan(null, null, (error, device) => {
        //
        // });
        bleManager.startDeviceScan(serviceUUIDs, null, (error, device) => {

            console.log('검색 된 디바이스 : ', device);
            if(error) console.log(error);

            if (device) {
                setAllDevices((prevState) => {
                    if (!isDuplicateDevice(prevState, device)) {
                        return [...prevState, device];
                    }
                    return prevState;
                });
            }
        })
    };

    const connectToDevice = async (device : Device) => {
        console.log('디바이스 = ', device);
        try {
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics();
            bleManager.stopDeviceScan();
        } catch (e) {
            console.log('ERROR IN CONNECTION : ', e);
        }
    }
    return {
        scanForPeripherals,
        requestPermissions,
        allDevices,
        connectToDevice,
    };
}

export default useBLE;
