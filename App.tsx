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
import Kontakt, {KontaktModule} from 'react-native-kontaktio'; // 비콘 스캔 및 비콘 정보 추출 라이브러리
import RNLocation from 'react-native-location'; // 휴대폰 기기 위치 추적 라이브러리


interface Beacon { // Beacon 타입 정의
    uuid: string;
    major: number;
    minor: number;
    rssi: number;
    name: string;
    proximity: string;
    accuracy: number;
    timestamp: number;
    storeName: string;
    txPower: number;
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


const App: React.FC = () => {

    /**
     *  @scanning : 상점 비콘 스캔 상태
     *  @LocationScanning : 자리 비콘 스캔 상태
     *
     *  @nearestBeacon : 가까운 상점 비콘 정보
     *  @nearestLocation : 가까운 자리 비콘 정보
     *
     *  @userName : 주문자 명
     *  @order : 주문 내용
     *  @store : 상점 명
     *  @locationName : 상점 내 자리 명
     */
    const [scanning, setScanning] = useState(true);
    const [LocationScanning, setLocationScanning] = useState(true);
    const [nearestBeacon, setNearestBeacon] = useState<Beacon | null>(null);
    const [nearestLocation, setNearestLocationBeacon] = useState<Beacon | null>(null);
    const [userName, setUserName] = useState('');
    const [order, setOrder] = useState('');
    const [store, setStore] = useState('');
    const [locationName, setLocationName] = useState('');


    /**
     *  @Title 위치 권한 요청 함수 정의
     *  @Explanation
     *  1. 블루투스 스캔 전 사용자에게 위치 권한 요청이 허용 되어야 합니다.
     *  2. 위치 권한 요청이 허용 되었을 경우 블루투스 장치 스캔을 진행 합니다.
     */
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

    /**
     *  @Title 비콘 스캔 준비 및 스캔 작업 함수
     *  @Explanation
     *  1. Android or IOS 모두 위치 권한 상태를 확인합니다.
     *  2. 허용 된 상태에서 connect() 함수를 통해 비콘이 어플을 감지 할 수 있도록 설정을 합니다.
     *  3. 감지 설정 후 startScanning() 함수를 통해 어플이 주변 비콘 신호를 감지하고 비콘 정보를 수집합니다.
     *  4. beaconScanning() 함수를 통해 수집 된 정보를 토대로 비콘을 실 스캔 합니다.
     */
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

        /**
         *  @Title 실제 비콘을 스캔하는 함수
         *
         *  @storeUUIDs 주변 상점들의 고유 비콘 UUID
         *  @locationUUIDs 해당 상점 내 설치 된 자리 비콘 UUID 목록
         *  @filteredBeacons 주변 전체 비콘 검색 후 storeUUIDs 값이 포함 된 것을 필터하여 담은 변수 (IDENIT 하위 가맹점 상점 비콘)
         *  @nearestBeacon filteredBeacons 에 담은 비콘 목록 중 현재 기기와 가장 가까운 비콘 정보
         *  @filteredLocationBeacons 주변 전체 비콘 검색 후  locationUUIDs 값이 포함 된 것을 필터하여 담은 변수 (IDENIT 하위 가맹점 내 개별 자리 비콘)
         */
        async function beaconScanning() {

            const storeUUIDs = ['fda50693-a4e2-4fb1-afcf-c6eb07647825'];

            const locationUUIDs = ['f8f3e757-5871-417a-b307-d52b82686813', '6a4e3c1b-9f8d-4c0a-8e2b-7e5a9d0a2f3e'];

            if (isAndroid) {
                DeviceEventEmitter.addListener(
                    'beaconsDidUpdate',
                    ({beacons, region}) => {

                        // console.log('검색 된 전체 상점 비콘들 : ', {beacons});

                        // 검색 : 전체 비콘 중 storeUUIDs 비콘만 필터하여 생성
                        const filteredBeacons = (beacons as Beacon[]).filter(beacon => storeUUIDs.includes(beacon.uuid));

                        // 감지된 비콘들이 위치한 지역 정보
                        // console.log('필터 된 상점 비콘들', {filteredBeacons});

                        // filteredBeacons 배열에서 rssi 값이 가장 큰 비콘 찾기 (rssi 값이 클 수록 가까운 위치)
                        const nearestBeacon = filteredBeacons.reduce((prev, current) => {
                            return (prev.rssi > current.rssi) ? prev : current;
                        });

                        // 가장 가까운 비콘의 정보 출력
                        // console.log('가장 가까운 상점 비콘 : ', nearestBeacon);

                        // 가장 가까운 비콘 감지 시, 상태 업데이트
                        setNearestBeacon(nearestBeacon);
                        setScanning(false);


                        if (nearestBeacon !== null) {

                            if (nearestBeacon.uuid === 'fda50693-a4e2-4fb1-afcf-c6eb07647825') {
                                setStore('아이덴잇 상점 테이크아웃 주문서');
                            }

                            // 자리 비콘 검색
                            const filteredLocationBeacons = (beacons as Beacon[]).filter(beacon => locationUUIDs.includes(beacon.uuid));

                            // console.log('자리 비콘 검색 : ', {filteredLocationBeacons});

                            if (filteredLocationBeacons.length > 0) {

                                const nearestLocationBeacon = filteredLocationBeacons.reduce((prev, current) => {
                                    return (prev.rssi > current.rssi) ? prev : current;
                                });

                                // 가장 가까운 비콘의 정보 출력
                                console.log('이름 : ', nearestLocationBeacon.name);
                                console.log('감도 : ', nearestLocationBeacon.rssi);
                                console.log('근처 : ', nearestLocationBeacon.proximity);

                                if (nearestLocationBeacon.proximity === 'IMMEDIATE') {

                                    setNearestLocationBeacon(nearestLocationBeacon);
                                    setLocationName(nearestLocationBeacon.name);
                                    console.log('가장 가까운 자리 비콘 : ', nearestLocationBeacon);
                                }
                                else{
                                    setNearestLocationBeacon(null);
                                }

                                // console.log('가장 가까운 자리 비콘이 있나요? : ', nearestLocation);
                            }

                            // setLocationScanning(false);

                            // 비콘 스캔 중지
                            // stopScanning();
                        }

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
                {
                    scanning ? (
                        <Text style={{fontSize: 24}}>
                            비콘 스캔 중...
                        </Text>
                    ) : (
                        nearestLocation ? (
                            <View>
                                <Text style={{fontSize: 24}}>{locationName} 자리</Text>
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
                        ) : (
                            <View>
                                {/*<Text>가장 가까운 비콘:</Text>*/}
                                {/*<Text>UUID: {nearestBeacon?.uuid}</Text>*/}
                                {/*<Text>Major: {nearestBeacon?.major}</Text>*/}
                                {/*<Text>Minor: {nearestBeacon?.minor}</Text>*/}
                                {/*<Text>RSSI: {nearestBeacon?.rssi}</Text>*/}

                                {/* 주문서 폼 추가 */}
                                <View>
                                    <Text style={{fontSize: 24}}>{store}</Text>
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
                        )
                    )
                }
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

export default App;
