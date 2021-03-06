import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from 'angularfire2/database';

import { ISite, Site } from '../../models';

@Injectable()
export class SitesProvider {

  items$: FirebaseListObservable<ISite[]>;

  constructor(
    public db: AngularFireDatabase
  ) {
      this.items$ = this.db.list('/sites');
  }

  create(title: string, editorId: string) {
    return this.items$.push(new Site(title, editorId));
  }

  update(siteId: string, changes: any) {
    /*
      Remove undefined properties or it should raise
      "firebase set failed first argument contains undefined in property"
    */ 
    Object.keys(changes).forEach(key => changes[key] === undefined && delete changes[key])
    return this.items$.update(siteId, changes);
  }

  delete(siteId: string) {
    return this.items$.remove(siteId);
  }

  fetchById(siteId: string): FirebaseObjectObservable<ISite> {
    return this.db.object(`sites/${siteId}`);
  }

  fetchByEditorId(editorId: string): FirebaseListObservable<ISite[]> {
    return this.db.list('/sites', 
    {
      query: {
        orderByChild: 'editor_id',
        equalTo: editorId
      }
    });
  }

  fetchAll(): FirebaseListObservable<ISite[]> {
    return this.items$;
  }
}
