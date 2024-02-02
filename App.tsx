import React, {useEffect, useState} from 'react';
import {
    Alert, Button,
    DeviceEventEmitter,
    NativeEventEmitter,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text, TextInput,
    View,
} from 'react-native';
import Kontakt, {KontaktModule} from 'react-native-kontaktio';


interface Beacon { // Beacon 타입 정의
    uuid: string;
    major: number;
    minor: number;
    rssi: number;
    proximity: string;
    accuracy: number;
    timestamp: number;
    storeName: string;
}

const {
    connect,
    init,
    startDiscovery,
    startRangingBeaconsInRegion,
    startScanning,
    stopScanning,
} = Kontakt;


const kontaktEmitter = new NativeEventEmitter(KontaktModule);

const isAndroid = Platform.OS === 'android';

// 2. 위치 권한 요청 함수 정의
const requestLocationPermission = async () => {

    try {

        // 사용자에게 위치 권한 요청
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: '안드로이드의 위치 권한 요청 (주변 매장 검색 요청)',
                message:
                    '위치 권한이 필요합니다. (주변 매장을 검색하기 위해선 권한이 필요합니다.)',
                buttonNeutral: '나중에',
                buttonNegative: '취소',
                buttonPositive: '확인',
            }
        );

        // 사용자의 선택에 따라 권한 부여 받았는지 여부 체크
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        } else {
            // permission denied
            return false;
        }

    } catch (err) {
        console.warn(err);
        return false;
    }
};

// 1. 비콘 설정 함수
// const beaconSetup = async () => {
//
//     // 현재 기기가 안드로이드인 경우
//     if (isAndroid) {
//
//         console.log('현재 요청 기기가 안드로이드 입니다.');
//
//         // 위치 권한 여부 함수
//         const granted = await requestLocationPermission();
//
//         // 3. 위치 권한 확인 되었을 경우
//         if (granted) {
//
//             // 4. 앱과 비콘을 연결하는 설정 : 비콘으 신호를 감지하고 정보를 수집하는데 필요 : 해당 작업이 마무리 될 때 까지 다음 단계로 진행 되지 않음
//             await connect();
//
//             // 5. 앱이 비콘의 신호를 스캔 준비 : 앱은 주변의 비콘 신호를 감지하고 정보를 수집 : 해당 작업이 마무리 될 때 까지 다음 단계로 진행 되지 않음
//             await startScanning();
//
//             // 6. 비콘 스캔 준비 완료 후 실제 스캔 진행
//             await beaconScanning();
//         }
//         // 3. 위치 권한 확인 되지 않았을 경우
//         else {
//             Alert.alert(
//                 '권한 요청 실패',
//                 '위치 권한이 부여되지 않아 비콘을 스캔할 수 없습니다. (주변 매장 검색 불가)',
//                 [
//                     {
//                         text: '다시 권한 요청하기 (주변 매장 검색하기)',
//                         onPress: () => {
//                             requestLocationPermission().then((granted) => {
//                                 if (granted) {
//                                     connect();
//                                     startScanning();
//                                 }
//                             })
//                         }
//                     },
//                     {
//                         text: 'OK',
//                         onPress: () => console.log('OK Pressed')
//                     }
//                 ],
//                 {cancelable: false}
//             );
//         }
//     }
//     // 현재 기기가 IOS 인 경우
//     else {
//
//         console.log('현재 요청 기기가 IOS 입니다.');
//         // iOS
//         await init();
//
//         /**
//          * Will discover Kontakt.io beacons only
//          */
//         await startDiscovery();
//
//         /**
//          * Works with any beacon(also virtual beacon, e.g. https://github.com/timd/MactsAsBeacon)
//          * Requires user to allow GPS Location (at least while in use)
//          *
//          * change to match your beacon values
//          */
//         await startRangingBeaconsInRegion({
//             identifier: '',
//             uuid: 'A4826DE4-1EA9-4E47-8321-CB7A61E4667E',
//             major: 1,
//             minor: 34,
//         });
//     }
//
//     // 실제 비콘 스캔 작업
//     async function beaconScanning() {
//
//         const targetUUIDs = ['fda50693-a4e2-4fb1-afcf-c6eb07647825'];
//
//         if (isAndroid) {
//             DeviceEventEmitter.addListener(
//                 'beaconsDidUpdate',
//                 ({beacons, region}) => {
//
//                     // 검색 전체 비콘 중 targetUUIDs 비콘만 필터하여 생성
//                     const filteredBeacons = (beacons as Beacon[]).filter(beacon => targetUUIDs.includes(beacon.uuid));
//                     // console.log('beaconsDidUpdate', { beacons, region });
//                     // console.log('Filtered beaconsDidUpdate', { beacons: filteredBeacons, region });
//
//                     // 감지된 비콘들이 위치한 지역 정보
//                     console.log('region', {region});
//
//                     // filteredBeacons 배열에서 rssi 값이 가장 큰 비콘 찾기 (rssi 값이 클 수록 가까운 위치)
//                     const nearestBeacon = filteredBeacons.reduce((prev, current) => {
//                         return (prev.rssi > current.rssi) ? prev : current;
//                     });
//
//                     // 가장 가까운 비콘의 정보 출력
//                     console.log('Nearest Beacon', nearestBeacon);
//
//                     // 가장 가까운 비콘 감지 시, 상태 업데이트
//                     setNearestBeacon(nearestBeacon);
//                     setScanning(false);
//                 },
//             );
//         }
//         else {
//             /* works with Kontakt.io beacons only */
//             kontaktEmitter.addListener('didDiscoverDevices', ({beacons}) => {
//                 console.log('didDiscoverDevices', {beacons});
//             });
//
//             /* works with any beacon */
//             kontaktEmitter.addListener('didRangeBeacons', ({beacons, region}) => {
//                 console.log('didRangeBeacons', {beacons, region});
//             });
//         }
//     }
// };

const App: React.FC = () => {

    // 비콘 스캔 상태를 저장하는 state
    const [scanning, setScanning] = useState(true);
    const [nearestBeacon, setNearestBeacon] = useState<Beacon | null>(null);

    // 주문 관련 state 추가
    const [userName, setUserName] = useState('');
    const [order, setOrder] = useState('');
    const [store, setStore] = useState('');

    // 비콘 설정 시작
    const beaconSetup = async () => {

        // 현재 기기가 안드로이드인 경우
        if (isAndroid) {

            console.log('현재 요청 기기가 안드로이드 입니다.');

            // 위치 권한 여부 함수
            const granted = await requestLocationPermission();

            // 3. 위치 권한 확인 되었을 경우
            if (granted) {

                // 4. 앱과 비콘을 연결하는 설정 : 비콘으 신호를 감지하고 정보를 수집하는데 필요 : 해당 작업이 마무리 될 때 까지 다음 단계로 진행 되지 않음
                await connect();

                // 5. 앱이 비콘의 신호를 스캔 준비 : 앱은 주변의 비콘 신호를 감지하고 정보를 수집 : 해당 작업이 마무리 될 때 까지 다음 단계로 진행 되지 않음
                await startScanning();

                // 6. 비콘 스캔 준비 완료 후 실제 스캔 진행
                await beaconScanning();
            }
            // 3. 위치 권한 확인 되지 않았을 경우
            else {
                Alert.alert(
                    '권한 요청 실패',
                    '위치 권한이 부여되지 않아 비콘을 스캔할 수 없습니다. (주변 매장 검색 불가)',
                    [
                        {
                            text: '다시 권한 요청하기 (주변 매장 검색하기)',
                            onPress: () => {
                                requestLocationPermission().then((granted) => {
                                    if (granted) {
                                        connect();
                                        startScanning();
                                    }
                                })
                            }
                        },
                        {
                            text: 'OK',
                            onPress: () => console.log('OK Pressed')
                        }
                    ],
                    {cancelable: false}
                );
            }
        }
        // 현재 기기가 IOS 인 경우
        else {

            console.log('현재 요청 기기가 IOS 입니다.');
            // iOS
            await init();

            /**
             * Will discover Kontakt.io beacons only
             */
            await startDiscovery();

            /**
             * Works with any beacon(also virtual beacon, e.g. https://github.com/timd/MactsAsBeacon)
             * Requires user to allow GPS Location (at least while in use)
             *
             * change to match your beacon values
             */
            await startRangingBeaconsInRegion({
                identifier: '',
                uuid: 'A4826DE4-1EA9-4E47-8321-CB7A61E4667E',
                major: 1,
                minor: 34,
            });
        }

        // 실제 비콘 스캔 작업
        async function beaconScanning() {

            const targetUUIDs = ['fda50693-a4e2-4fb1-afcf-c6eb07647825'];

            if (isAndroid) {
                DeviceEventEmitter.addListener(
                    'beaconsDidUpdate',
                    ({beacons, region}) => {

                        // 검색 전체 비콘 중 targetUUIDs 비콘만 필터하여 생성
                        const filteredBeacons = (beacons as Beacon[]).filter(beacon => targetUUIDs.includes(beacon.uuid));

                        // 감지된 비콘들이 위치한 지역 정보
                        console.log('region', {region});

                        // filteredBeacons 배열에서 rssi 값이 가장 큰 비콘 찾기 (rssi 값이 클 수록 가까운 위치)
                        const nearestBeacon = filteredBeacons.reduce((prev, current) => {
                            return (prev.rssi > current.rssi) ? prev : current;
                        });

                        if (nearestBeacon !== null && nearestBeacon.uuid === 'fda50693-a4e2-4fb1-afcf-c6eb07647825') {
                            setStore('아이덴잇 상점 주문서');
                        }

                        // 가장 가까운 비콘의 정보 출력
                        console.log('Nearest Beacon', nearestBeacon);

                        // 가장 가까운 비콘 감지 시, 상태 업데이트
                        setNearestBeacon(nearestBeacon);
                        setScanning(false);

                        // 비콘 스캔 중지
                        stopScanning();
                    },
                );
            } else {
                /* works with Kontakt.io beacons only */
                kontaktEmitter.addListener('didDiscoverDevices', ({beacons}) => {
                    console.log('didDiscoverDevices', {beacons});
                });

                /* works with any beacon */
                kontaktEmitter.addListener('didRangeBeacons', ({beacons, region}) => {
                    console.log('didRangeBeacons', {beacons, region});
                });
            }
        }
    };

    useEffect(() => {

        Promise.resolve().then(beaconSetup);

        return () => {
            if (isAndroid) {
                kontaktEmitter.removeAllListeners('beaconsDidUpdate');
            } else {
                kontaktEmitter.removeAllListeners('didDiscoverDevices');
                kontaktEmitter.removeAllListeners('didRangeBeacons');
            }
        };
    }, []);

    return (
        <SafeAreaView>
            <StatusBar barStyle="dark-content"/>
            <View>
                {scanning ? (
                    <Text style={styles.title}>
                        비콘 스캔 중...
                    </Text>
                ) : (
                    <View>
                        {/*<Text>가장 가까운 비콘:</Text>*/}
                        {/*<Text>UUID: {nearestBeacon?.uuid}</Text>*/}
                        {/*<Text>Major: {nearestBeacon?.major}</Text>*/}
                        {/*<Text>Minor: {nearestBeacon?.minor}</Text>*/}
                        {/*<Text>RSSI: {nearestBeacon?.rssi}</Text>*/}

                        {/* 주문서 폼 추가 */}
                        <View>
                            <Text>{store}</Text>
                            <TextInput
                                style={styles.input}
                                onChangeText={text => setUserName(text)}
                                value={userName}
                                placeholder="이름"
                            />
                            <TextInput
                                style={styles.input}
                                onChangeText={text => setOrder(text)}
                                value={order}
                                placeholder="주문 내용"
                            />
                            <Button
                                title="주문하기"
                                onPress={() => {
                                    console.log(`이름: ${userName}, 주문 내용: ${order}`);
                                    setUserName('');
                                    setOrder('');
                                }}
                            />
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // ...

    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        margin: 10,
    },
    title: {}

});


// const styles = StyleSheet.create({
//     wrapper: {
//         height: '100%',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     title: {
//         paddingVertical: 10,
//         fontSize: 30,
//     },
// });

export default App;
