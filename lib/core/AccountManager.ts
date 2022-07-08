"use strict";

import { findNode, InnertubeError, throwIfMissing } from "../utils/Utils";
import Constants from "../utils/Constants";
import Analytics from "../parser/youtube/Analytics";
import Proto from "../proto";
import type Actions from "./Actions";
import type { APIResponse } from "../utils/common";

/** @namespace */
class AccountManager {
  #actions: Actions;

  constructor(actions: Actions) {
    this.#actions = actions;
  }

  /**
   * @namespace
   */
  channel = {
    /**
     * Edits channel name.
     */
    editName: (new_name: string): Promise<APIResponse<object>> => {
      return this.#actions.channel("channel/edit_name", { new_name });
    },

    /**
     * Edits channel description.
     */
    editDescription: (new_description: string): Promise<APIResponse<object>> => {
      return this.#actions.channel("channel/edit_description", { new_description })
    },

    /**
     * Retrieves basic channel analytics.
     *
     * @borrows getAnalytics as getBasicAnalytics
     */
    getBasicAnalytics: () => this.getAnalytics(),
  };

  /**
   * @namespace
   */
  settings = {
    notifications: {
      /**
       * Notify about activity from the channels you're subscribed to.
       *
       * @param option - ON | OFF
       */
      setSubscriptions: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.SUBSCRIPTIONS,
          "SPaccount_notifications",
          option,
        ),

      /**
       * Recommended content notifications.
       *
       * @param option - ON | OFF
       */
      setRecommendedVideos: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.RECOMMENDED_VIDEOS,
          "SPaccount_notifications",
          option,
        ),

      /**
       * Notify about activity on your channel.
       *
       * @param option - ON | OFF
       * @returns
       */
      setChannelActivity: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.CHANNEL_ACTIVITY,
          "SPaccount_notifications",
          option,
        ),

      /**
       * Notify about replies to your comments.
       *
       * @param option - ON | OFF
       * @returns
       */
      setCommentReplies: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.COMMENT_REPLIES,
          "SPaccount_notifications",
          option,
        ),

      /**
       * Notify when others mention your channel.
       *
       * @param option - ON | OFF
       * @returns 
       */
      setMentions: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.USER_MENTION,
          "SPaccount_notifications",
          option,
        ),

      /**
       * Notify when others share your content on their channels.
       *
       * @param option - ON | OFF
       * @returns
       */
      setSharedContent: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.SHARED_CONTENT,
          "SPaccount_notifications",
          option,
        ),
    },
    /**
     * @namespace
     */
    privacy: {
      /**
       * If set to true, your subscriptions won't be visible to others.
       *
       * @param option - ON | OFF
       */
      setSubscriptionsPrivate: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.SUBSCRIPTIONS_PRIVACY,
          "SPaccount_privacy",
          option,
        ),

      /**
       * If set to true, saved playlists won't appear on your channel.
       *
       * @param option - ON | OFF
       */
      setSavedPlaylistsPrivate: (option: boolean): Promise<APIResponse<object>> =>
        this.#setSetting(
          Constants.ACCOUNT_SETTINGS.PLAYLISTS_PRIVACY,
          "SPaccount_privacy",
          option,
        ),
    },
  };

  /**
   * Internal method to perform changes on an account's settings.
   *
   * @private
   * @param setting_id
   * @param type
   * @param new_value
   */
  async #setSetting(setting_id: string, type: string, new_value: string): Promise<APIResponse<object>> {
    throwIfMissing({ setting_id, type, new_value });

    const values = { ON: true, OFF: false };

    if (!values.hasOwnProperty(new_value)) {
      throw new InnertubeError("Invalid option", {
        option: new_value,
        available_options: Object.keys(values),
      });
    }

    const response = await this.#actions.browse(type);

    const contents = (() => {
      switch (type.trim()) {
        case "SPaccount_notifications":
          return findNode(
            response.data,
            "contents",
            "Your preferences",
            13,
            false,
          ).options;
        case "SPaccount_privacy":
          return findNode(
            response.data,
            "contents",
            "settingsSwitchRenderer",
            13,
            false,
          ).options;
        default:
          // This is just for maximum compatibility, this is most definitely a bad way to handle this
          throw new TypeError("undefined is not a function");
      }
    })();

    const option = contents.find(
      (option) =>
        option.settingsSwitchRenderer.enableServiceEndpoint.setSettingEndpoint
          .settingItemIdForClient == setting_id,
    );

    const setting_item_id = option.settingsSwitchRenderer.enableServiceEndpoint
      .setSettingEndpoint.settingItemId;
    const set_setting = await this.#actions.account("account/set_setting", {
      new_value:
        type == "SPaccount_privacy" ? !values[new_value] : values[new_value],
      setting_item_id,
    });

    return set_setting;
  }

  /**
   * Retrieves channel info.
   */
  async getInfo(): Promise<{ name: string; email: string; channel_id: string; subscriber_count: string; photo: object[]; }> {
    const response = await this.#actions.account("account/accounts_list", {
      client: "ANDROID",
    });

    const account_item_section_renderer = findNode(
      response.data,
      "contents",
      "accountItem",
      8,
      false,
    );
    const profile = account_item_section_renderer.accountItem.serviceEndpoint
      .signInEndpoint.directSigninUserProfile;

    const name = profile.accountName;
    const email = profile.email;
    const photo = profile.accountPhoto.thumbnails;
    const subscriber_count =
      account_item_section_renderer.accountItem.accountByline.runs.map(
        (run) => run.text,
      ).join("");
    const channel_id = response.data.contents[0].accountSectionListRenderer
      .footers[0].accountChannelRenderer.navigationEndpoint.browseEndpoint
      .browseId;

    return { name, email, channel_id, subscriber_count, photo };
  }

  /**
   * Retrieves time watched statistics.
   */
  async getTimeWatched(): Promise<Array<{ title: string; time: string; }>> {
    const response = await this.#actions.browse("SPtime_watched", {
      client: "ANDROID",
    });

    const rows = findNode(
      response.data,
      "contents",
      "statRowRenderer",
      11,
      false,
    );

    const stats = rows.map((row) => {
      const renderer = row.statRowRenderer;
      if (renderer) {
        return {
          title: renderer.title.runs.map((run) => run.text).join(""),
          time: renderer.contents.runs.map((run) => run.text).join(""),
        };
      }
    }).filter((stat) => stat);

    return stats;
  }

  /**
   * Retrieves basic channel analytics.
   */
  async getAnalytics(): Promise<Analytics> {
    const info = await this.getInfo();

    const params = Proto.encodeChannelAnalyticsParams(info.channel_id);
    const response = await this.#actions.browse("FEanalytics_screen", {
      params,
      client: "ANDROID",
    });

    return new Analytics(response.data);
  }
}

export default AccountManager;
