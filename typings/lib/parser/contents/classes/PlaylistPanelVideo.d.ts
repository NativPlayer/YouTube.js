export = PlaylistPanelVideo;
declare class PlaylistPanelVideo {
    constructor(data: any);
    type: string;
    title: Text;
    thumbnail: Thumbnail[];
    endpoint: NavigationEndpoint;
    selected: any;
    video_id: any;
    duration: {
        text: any;
        seconds: number;
    };
    author: any;
    album: {
        id: any;
        name: any;
        year: any;
        endpoint: any;
    };
    artists: any;
    badges: any;
    menu: any;
    set_video_id: any;
}
import Text = require("./Text");
import Thumbnail = require("./Thumbnail");
import NavigationEndpoint = require("./NavigationEndpoint");
