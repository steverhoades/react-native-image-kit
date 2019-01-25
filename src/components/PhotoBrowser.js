'use strict';

import React from 'react';
import {ViewPropTypes, Dimensions, View, Animated, StyleSheet, StatusBar, Keyboard, Modal, Alert} from 'react-native';
import { Root, Container, Header, Title, Button, Icon, Left, Right, Text, Toast, CardItem, Body, Item, Input, Card}
    from 'native-base';
import PropTypes from 'prop-types';
import Popup from './Popup';
import { ImagePicker, ScreenOrientation } from "expo";
import GridContainer from "./GridContainer";
import PhotoEditor from "./PhotoEditor";
import { PictureList, Common } from '../lib';
import OverlayMenu from './OverlayMenu';

export default class PhotoBrowser extends React.Component {

    static propTypes = {
        isModal: PropTypes.bool,
        folder: PropTypes.string,
        pictureList: PropTypes.object,
        style: ViewPropTypes.style,
        square: PropTypes.bool,
        customBtn: PropTypes.array,
        customEditorBtn: PropTypes.array,
        useShare: PropTypes.bool,
        useSpawn: PropTypes.bool,
        usePhotoLib: PropTypes.bool,
        getFromWeb: PropTypes.bool,
        onClose: PropTypes.func,
    };

    static defaultProps = {
        isModal: true,
        folder: 'images',
        pictureList: null,
        square: false,
        customBtn: [],
        customEditorBtn: [],
        useShare: true,
        useSpawn: true,
        usePhotoLib: true,
        getFromWeb: true,
        onClose: null,
    };

    constructor(props) {
        super(props);
        const {width, height} = Dimensions.get('window');
        this.pictureList = props.pictureList ?  props.pictureList : new PictureList(props.folder);
        this._customBtn = [];
        this._customEditorBtn = [];
        this.uriModal = null;
        this.customMenu = null;
        this.imageRequestUri = '';
        this.state = {
            width : width,
            height: height,
            headerHeight : Common.header.height,
            show  : false,
            gridShow : true,
            menuShow : true,
            isFullScreen : false,
            fullScreenAnim: new Animated.Value(0)
        };
        this.onHeaderLayout = this.onHeaderLayout.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this._onGridPhotoTap = this._onGridPhotoTap.bind(this);
        this._onCloseEditor = this._onCloseEditor.bind(this);
        this._onDelete = this._onDelete.bind(this);
        this._onSpawn = this._onSpawn.bind(this);
    }

    get customBtn() {
        return this.props.customBtn.concat(this._customBtn);
    }

    set customBtn(btns) {
        this._customBtn = btns;
    }

    get customEditorBtn() {
        return this.props.customEditorBtn.concat(this._customEditorBtn);
    }

    set customEditorBtn(btns) {
        this._customEditorBtn = btns;
    }

    onHeaderLayout(e) {
        const height = e.nativeEvent.layout.height;
        if (this.state.headerHeight !== height ){
            this.setState({headerHeight : height})
        }
    }

    _onGridPhotoTap(index) {
        console.log('_onGridPhotoTap : ',index);
        this.pictureList.currentIndex = index;
        this._toggleFullScreen(true);
    }

    _onCloseEditor() {
        this._toggleFullScreen(false);
    }

    async _onSpawn() {
        let media = await this.pictureList.spawn();
        if(media) this.forceUpdate();
        return media;
    }

    _getImageFromPhotoLib = async () => {
        this.setState({gridShow: false});
        let picture = null;
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
        });
        if ( result.cancelled ) {
            this.setState({gridShow: true});
        }else{
            console.log('onImageAdd1', result);
            let {uri, width, height} = result;
            picture = await this.pictureList.insert(uri, width, height);
            console.log('onImageAdd2', picture);
            if (picture === null){
                Toast.show({
                    text: "Wrong Image Type (not JPG nor PNG)!",
                    buttonText: "Okay",
                    type: "warning"
                });
            }
            this.setState({gridShow: true});
        }
        return picture;
    };

    _getImageByURI = async () => {
        this.uriModal.open();
    };

    _requestImageCancel = async () => {
        this.uriModal.close();
    };

    _requestImage = async () => {
        let picture = null;
        if(this.imageRequestUri){
            picture = await this.pictureList.insert(this.imageRequestUri);
        }
        this.uriModal.close();
        if (picture === null){
            Toast.show({
                text: "Wrong Image Type (not JPG nor PNG)!",
                buttonText: "Okay",
                type: "warning",
                duration: 3000,
            });
        }else{
            this.pictureList.currentIndex = 0;
            this._toggleFullScreen(true);
        }
    };

    _onDelete( ) {
        Alert.alert(
            'Notice',
            'Do you want delete this image and go back to the list?',
            [
                { text: 'No', onPress: () => console.log('Cancel delete image.'), style: 'cancel'},
                {
                    text: 'Yes',
                    onPress: async () => {
                        await this.pictureList.remove();
                        this._toggleFullScreen(false);
                    }
                },
            ]
        );
    };

    _toggleFullScreen(display) {
        this.setState({ isFullScreen: display });
        Animated.timing(
            this.state.fullScreenAnim,
            {
                toValue: display ? 1 : 0,
                duration: 300,
            }
        ).start();
        if(!display)
            this.pictureList.current.reset();
    }

    _toggleCustomMenu() {
        if(this.customMenu){
            this.customMenu.toggle();
        }
    }

    _onOpenCustomMenu = () => {
        this.setState({menuShow: false});
    };

    _onCloseCustomMenu = () => {
        this.setState({menuShow: true});
    };

    get headerBtn() {
        let buttons = this.customBtn;

        if (this.props.getFromWeb){
            buttons.push({
                callback: this._getImageByURI,
                icon: {
                    name: 'download',
                    type: 'MaterialCommunityIcons',
                },
            })
        }
        if (this.props.usePhotoLib){
            buttons.push({
                callback: this._getImageFromPhotoLib,
                icon: {
                    name: 'film',
                    type: 'MaterialCommunityIcons',
                },
            })
        }
        return buttons;
    }

    _renderURIModal() {
        if (this.props.getFromWeb) {
            return (
                <Popup ref={(e) => { this.uriModal = e; }} style={styles.modal}>
                    <Card style={styles.card}>
                        <CardItem header style={styles.block}>
                            <Text style={styles.title}> Input image URL </Text>
                        </CardItem>
                        <CardItem style={styles.block}>
                            <Body>
                            <Item>
                                <Icon style={styles.icon} type="MaterialCommunityIcons" name={'image'}/>
                                <Input style={styles.input} autoFocus placeholder="Type image URL"
                                       onChangeText={v => this.imageRequestUri = v}/>
                            </Item>
                            <Text style={styles.desc}>
                                {'The URL should include the image file name because the image type is determined by the file name.'}
                            </Text>
                            </Body>
                        </CardItem>
                        <CardItem footer style={styles.block}>
                            <Button bordered warning style={styles.button} onPress={this._requestImageCancel}>
                                <Icon style={styles.icon} type="MaterialCommunityIcons" name={'cancel'}/>
                                <Text style={styles.warningText}>Cancel</Text>
                            </Button>
                            <Button bordered success style={styles.button} onPress={this._requestImage}>
                                <Icon style={styles.icon} type="MaterialCommunityIcons" name={'download'}/>
                                <Text style={styles.successText}>OK</Text>
                            </Button>
                        </CardItem>
                    </Card>
                </Popup>
            );
        } else return null
    }

    renderPhotos() {
        if(this.state.show && this.state.gridShow){
            const itemPerRow = Math.round(this.state.width/240.0);
            let container;
            if (this.pictureList.length > 0) {
                if (this.state.isFullScreen) {
                    container = (
                        <PhotoEditor
                            picture={this.pictureList.current}
                            useCircleProgress={false}
                            onClose={this._onCloseEditor}
                            onDelete={this._onDelete}
                            onSpawn={this._onSpawn}
                            useShare={this.props.useShare}
                            useSpawn={this.props.useSpawn}
                            height={this.state.height-this.state.headerHeight-Common.statusBar.height}
                            customBtn={this.customEditorBtn}
                        />
                    );
                } else {
                    container = (
                        <Animated.View
                            style={{
                                height: this.state.height,
                                marginTop: this.state.fullScreenAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, this.state.height * -1 - 70],
                                }),
                            }}
                        >
                            <GridContainer
                                square={this.props.square}
                                offset={0}
                                pictureList={this.pictureList}
                                displaySelectionButtons={true}
                                onPhotoTap={this._onGridPhotoTap}
                                itemPerRow={itemPerRow}
                            />
                        </Animated.View>
                    );
                }
            }
            return (
                <View style={[styles.container]}>
                    {container}
                </View>
            );
        }else{
            return (
                <Text> </Text>
            );
        }
    }

    _renderMenuButton(){
        if( this.state.menuShow )
            return (
                <Button transparent style={styles.headerButton}
                        onPress={ () => this._toggleCustomMenu(true) }>
                    <Icon  name="menu" type="MaterialCommunityIcons" />
                </Button>
            );
        else return null
    }

    render() {
        const { isModal } = this.props;
        const container = (
            <Container>
                <OverlayMenu ref={(ref) => {this.customMenu = ref;}} buttons={this.headerBtn}
                             onOpen={this._onOpenCustomMenu} onClose={this._onCloseCustomMenu}>
                    <Header onLayout={this.onHeaderLayout}>
                        <StatusBar translucent={false} animated />
                        <Left style={{flex: 1}}>
                            <Button transparent style={styles.headerButton} onPress={this.closeModal }>
                                <Icon  name="logout" type="MaterialCommunityIcons"
                                       style={{transform: [{ rotateY: '180deg'}]}}/>
                            </Button>
                        </Left>
                        <Body style={{flex: 1}}>
                            <Button iconLeft transparent >
                                <Title tyle={{color:Common.toolbar.btnTextColor, marginBottom:2, }}>
                                    {this.state.isFullScreen ?
                                        `${this.pictureList.currentIndex+1}/${this.pictureList.length} photos` :
                                        `${this.pictureList.length} photos`}
                                </Title>
                            </Button>
                        </Body>
                        <Right style={{flex: 1}}>
                            {this._renderMenuButton()}
                        </Right>
                    </Header>
                    <Root>
                        {this.renderPhotos()}
                    </Root>
                </OverlayMenu>
                {this._renderURIModal()}
            </Container>
        );
        if (isModal){
            return(
                <Modal visible={this.state.show} presentationStyle={'fullScreen'} onRequestClose={this.closeModal}>
                    {container}
                </Modal>
            );
        } else {
            return container;
        }
    }

    openModal() {
        Keyboard.dismiss();
        const {width, height} = Dimensions.get('window');
        if ( this.state.width !== width || this.state.height !== height){
            this.setState({
                width : width,
                height: height,
                show : true,
            });
        } else {
            this.setState({show : true});
        }
        this.pictureList.cleanup();
        console.log('openModal', this.state);
        /*if (width > height)
            ScreenOrientation.allowAsync(ScreenOrientation.Orientation.LANDSCAPE);
        else
            ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);*/
    }

    closeModal(){
        if(this.props.onClose){
            this.props.onClose(this.pictureList);
        } else {
            /*if ( this.state.width > 480 && this.state.height > 480 ){
                ScreenOrientation.allowAsync(ScreenOrientation.Orientation.ALL);
            }*/
            this.setState({
                show: false,
                currentIndex : 0,
                isFullScreen : false,
            });
            this.pictureList.cleanup();
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    modal: {
        paddingTop: 20,
    },
    card: {
        height : 245,
        width : 300,
    },
    input: {
        width: 240,
        color: '#606060',
    },
    title: {
        fontWeight: 'bold',
    },
    desc: {
        marginTop: 8,
        fontSize: 10,
        color: "#62B1F6",
    },
    headerButton: {
        padding: 0,
        margin: 0,
    },
    button: {
        justifyContent: 'center',
        width: 130,
    },
    icon: {
        margin: 0,
        padding: 0,
    },
    successText: {
        color : "#5cb85c",
    },
    warningText: {
        color : "#f0ad4e",
        paddingLeft: 0,
    },
    block: {
        justifyContent: 'space-evenly',
    }
});