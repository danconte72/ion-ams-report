import { Component, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import { Http } from '@angular/http';
import { groupRowsBy } from './../../helpers/helpers';

import { SitesProvider, UserProvider } from './../../providers';
import { ISite, IUser } from './../../models';
import 'rxjs/add/operator/map';

//import { DataTableModule } from 'primeng/primeng';
import { CalendarController } from "ion2-calendar/dist";
import * as moment from 'moment';
import { Moment } from 'moment';

@IonicPage({
  name: 'sites-report',
  segment: 'report/:id'
})
@Component({
  selector: 'page-sites-report',
  templateUrl: 'sites-report.html',
  providers: []
})

export class SitesReportPage {

  site: ISite;
  reports: FirebaseListObservable<any>;
  query: {orderByKey?: boolean, orderByChild?: string, startAt?: string, endAt?: string} = {};
  rangeFilter: {startAt?: Moment, endAt?: Moment} = {};
  latestUnpluggedImport: Moment;
  rep: any[];
  user: IUser;
  isAdmin: boolean;
  role: string;
  roles: string[] = ["editor", "admin"];

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public sitesService: SitesProvider,
    public loadingCtrl: LoadingController,
    private db: AngularFireDatabase,
    private elRef:ElementRef,
    private http: Http,
    public calendarCtrl: CalendarController,
    public userService: UserProvider
  ) {
    this.user = userService.getCurrent();
    
    if (this.user) {
      this.isAdmin = (this.user.role == 'admin');
      this.role = this.user.role;
    }
  }

  ionViewCanEnter(): boolean {
    let user = this.userService.getCurrent();

    return !!user;
  }
  
  toggleRole() {
    this.role = this.roles[(this.roles.indexOf(this.role) + 1) % this.roles.length];
  }

  last7days() {
    this.rangeFilter = {
      startAt: moment().subtract(6, 'days'),
      endAt: moment()
    }

    this.fetchDataByQuery();
  }

  last30days() {
    this.rangeFilter = {
      startAt: moment().subtract(29, 'days'),
      endAt: moment()
    }

    this.fetchDataByQuery();
  }

  lastMonth() {
    this.rangeFilter = {
      startAt: moment().subtract(1, 'month').startOf('month'),
      endAt: moment().subtract(1, 'month').endOf('month')
    }

    this.fetchDataByQuery();
  }

  currentMonth() {
    this.rangeFilter = {
      startAt: moment().startOf('month'),
      endAt: moment()
    }

    this.fetchDataByQuery();
  }

  formatQuery() {
    //this.query.orderByChild = 'date';
    this.query.orderByKey = true;
    this.query.startAt = this.rangeFilter.startAt.format('YYYY-MM-DD');
    this.query.endAt = this.rangeFilter.endAt.format('YYYY-MM-DD');
  }

  getQueryOrderedByChildAndRange(range, filtersPrefix) {
    let startDate = range.startAt.format('YYYY-MM-DD');
    let endDate = range.endAt.format('YYYY-MM-DD');
    
    let query = {
      orderByChild: filtersPrefix ? 'group' : 'date',
      startAt: filtersPrefix ? filtersPrefix + '_' +  startDate : startDate,
      endAt: filtersPrefix ? filtersPrefix + '_' +  endDate : endDate
    }
    console.log(query);

    return query;
  }

  fetchDataByQuery() {
    let loader = this.loadingCtrl.create({
      content: 'Getting latest entries...',
      //dismissOnPageChange: true
    });

    loader.present().then(() => {
      let path = '/reports/';

      let siteName = this.site.title ? this.site.title.toLowerCase() : null;
      let query = this.getQueryOrderedByChildAndRange(this.rangeFilter, siteName);
      
      console.log(query);
      return this.db.list(path, {query: query})
      .subscribe(
        data => {
          console.log('Dd data fetched');
          //console.log(data);
          var raws = {};
          
          data.forEach(group => {
            //raws.concat(group['raws']);
            Object.assign(raws, group['raws']);
          });

          var result = Object.keys(raws).map((key)=>raws[key]);

          //console.log(result);
          if (Object.keys(result).length) {
            console.log("Result's length: " + Object.keys(result).length);
            this.rep = groupRowsBy(result, 'inventaire');
          } else {
            console.log("Result's length 0");
            this.rep = groupRowsBy(result, 'inventaire');
          }
          loader.dismiss();   
        },
        err => {
          loader.dismiss();
          console.log('error');
        });
    });  
  }

  getLatestUnpluggedImport(){
    let path = '/settings/';
    this.db.object(path)
    .subscribe(
      data => {        
        this.latestUnpluggedImport = moment(data.latestUnpluggedImport);
      },
      err => {
        console.log('error');
      }
    );    
  }

  openCalendar() {
    this.calendarCtrl.openCalendar({
      //from: new Date(),
      pickMode:'range',
      isSaveHistory:true,
      canBackwardsSelected: true,
    })
      .then( (res:any) => { 
        console.log('open Calendar')
        console.log(res) 
        this.rangeFilter = {
          startAt: moment(res.from.time),
          endAt: moment(res.to.time)
        }

        this.fetchDataByQuery();
      })
      .catch( () => {} )
  }
  
  ionViewDidLoad() {

    let siteId = this.navParams.data.id;

    this.sitesService.fetchById(siteId)
      .subscribe( siteSnap => {
        this.site = siteSnap;
        console.log('========= Site');
        console.log(this.site);
        this.last7days();
        this.getLatestUnpluggedImport();
      }
    );
  }
}