import { Person } from './person.model';
import { Location } from './location.model';

import { bisect_left, bisect_right, pdf_to_cdf, getRandomInt, sample } from '../utility-functions'
import { HEALTH_STATUSES } from './constants';

export class Community {

    // Data structures
    people: Person[] = [];
    homes: Location[] = [];
    workplaces: Location[] = [];
    schools: Location[] = [];
    
    // Static parameters (not exposed)
    // Assume everyone sleeps 8 hours
    numHoursHome: number = 4;
    numContactsPerHourHome: number = 2;
    numHoursWork: number = 8;
    numContactsPerHourWork: number = 4;
    numHoursSchool: number = 8;
    numContactsPerHourSchool: number = 10;
    // Can be spent at home, with friends, or at store
    numHoursFree: number = 4;
    numContactsPerHourStore: 3;

    // Disease properties
    incubationDaysRange: [number, number];
    asymptomaticDaysRange: [number, number];
    infectionDaysRange: [number, number];
    pInfect: number;
    pFatal: number[];

    // Behavioral properties/counter-measure settings

    percentWorking: number = 100;
    oneShopperPerHousehold: boolean = false;

    // State variables
    date: number = 0;
    currentR0: number = 0;
    statusCounts: object = {};

    /**
     * ageDist: should be an array of length 9, with a fraction for each decade 0-79 and 80+
     * homeSizeDist: should be an array of length 8, with a fraction for each household size 1-8
     * workplaceSizeDist: should be an array of length 13, with a fraction for every 10 from 0-99, and for 100-149, 150-199, and 200+ (which will be set to 200)
     * schoolSizeDist: should be an array of length 11, with a fraction for every 100 from 0-999, and 1000+ (which will be set to 1000)
     * pFatal: should be an array of length 9, with a fatality probability for each decade 0-79 and 80+
     */
    constructor(
        numPeople: number,
        ageDist: number[],
        homeSizeDist: number[],
        workplaceSizeDist: number[],
        schoolSizeDist: number[],
        pInfect: number,
        incubationDaysRange: [number, number],
        asymptomaticDaysRange: [number, number],
        infectionDaysRange: [number, number],
        ratioOver65Employed: number,
        initialNumInfected: number,
        initialDispersion: string,
        pFatal: number[]
    ) {
        this.pInfect = pInfect;
        this.incubationDaysRange = incubationDaysRange;
        this.asymptomaticDaysRange = asymptomaticDaysRange;
        this.infectionDaysRange = infectionDaysRange;
        this.pFatal = pFatal;

        let ageCDF = pdf_to_cdf(ageDist);
        let homeSizeCDF = pdf_to_cdf(homeSizeDist);
        let workSizeCDF = pdf_to_cdf(workplaceSizeDist);
        let schoolSizeCDF = pdf_to_cdf(schoolSizeDist);

        let availableCoords: Array<[number, number]> = [];
        let dim = Math.ceil(Math.sqrt(numPeople));
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                availableCoords.push([i, j]);
            }
        }

        let numChildren = 0;
        let numAdults = 0;
        let numOver65 = 0;

        // Create people with ages
        for (let i = 0; i < numPeople; i++) {
            let p: Person = new Person(i);
            let idx = bisect_left(ageCDF, Math.random());
            p.age = getRandomInt(10*idx, 10*idx + 9);
            if (p.age < 6) { /* Don't count very young children */ }
            else if (p.age <= 18)
                ++numChildren;
            else if (p.age < 65)
                ++numAdults;
            else
                ++numOver65;
            this.people.push(p);
        }

        // Assign homes based on homeSizeDist to each person
        let totalHomeCapacity = 0;
        let homeSizes = [];
        while (totalHomeCapacity < this.people.length) {
            let size = bisect_left(homeSizeCDF, Math.random()) + 1;
            if (totalHomeCapacity + size > this.people.length) {
                size = this.people.length - totalHomeCapacity;
            }
            let idx = getRandomInt(0, availableCoords.length - 1);
            let coords = availableCoords[idx];
            availableCoords.splice(idx, 1);
            let h: Location = new Location(this.homes.length, 0, size, coords);
            this.homes.push(h);
            homeSizes.push([h.id, size]);
            totalHomeCapacity += size;
        }
        for (let person of this.people) {
            let idx = getRandomInt(0, homeSizes.length - 1);
            person.homeId = homeSizes[idx][0];
            this.homes[person.homeId].members.push(person.id);
            homeSizes[idx][1] -= 1;
            if (homeSizes[idx][1] <= 0) {
                homeSizes.splice(idx, 1);
            }
        }

        // Create enough workplaces for the population
        let numPlus65Workers = Math.round(ratioOver65Employed * numOver65);
        let numWorkers = numAdults + numPlus65Workers;
        let totalWorkCapacity = 0;
        let workSizes = [];
        while (totalWorkCapacity < numWorkers) {
            let idx = bisect_left(workSizeCDF, Math.random());
            let size: number;
            if (idx <= 9)
                size = getRandomInt(10*idx, 10*idx + 9);
            else if (idx === 10)
                size = getRandomInt(100, 149);
            else if (idx === 11)
                size = getRandomInt(150, 199);
            else
                size = 200;
            if (totalWorkCapacity + size > numWorkers) {
                size = numWorkers - totalWorkCapacity;
            }
            let coordsIx = getRandomInt(0, availableCoords.length - 1);
            let coords = availableCoords[coordsIx];
            availableCoords.splice(coordsIx, 1);
            let wp: Location = new Location(this.workplaces.length, 1, size, coords);
            this.workplaces.push(wp);
            workSizes.push([wp.id, size]);
            totalWorkCapacity += size;
        }

        // Create enough schools for the population
        let totalSchoolCapacity = 0;
        let schoolSizes = [];
        while (totalSchoolCapacity < numChildren) {
            let idx = bisect_left(schoolSizeCDF, Math.random());
            let size: number;
            if (idx <= 9)
                size = getRandomInt(100*idx, 100*idx + 99);
            else
                size = 1000;
            if (totalSchoolCapacity + size > numChildren) {
                size = numChildren - totalSchoolCapacity;
            }
            let coordsIx = getRandomInt(0, availableCoords.length - 1);
            let coords = availableCoords[coordsIx];
            availableCoords.splice(coordsIx, 1);
            let s: Location = new Location(this.schools.length, 2, size, coords);
            this.schools.push(s);
            schoolSizes.push([s.id, size]);
            totalSchoolCapacity += size;
        }

        // Assign people randomly to work/school
        let num65PlusAssigned = 0;
        for (let person of this.people) {
            if (person.age < 6) { /* Don't add young children to school or work */ }
            else if (person.age <= 18) {
                let idx = getRandomInt(0, schoolSizes.length - 1);
                person.schoolId = schoolSizes[idx][0];
                this.schools[person.schoolId].members.push(person.id);
                schoolSizes[idx][1] -= 1;
                if (schoolSizes[idx][1] <= 0) {
                    schoolSizes.splice(idx, 1);
                }
            }
            else if (person.age < 65) {
                let idx = getRandomInt(0, workSizes.length - 1);
                person.workId = workSizes[idx][0];
                this.workplaces[person.workId].members.push(person.id);
                workSizes[idx][1] -= 1;
                if (workSizes[idx][1] <= 0) {
                    workSizes.splice(idx, 1);
                }
            }
            else if (num65PlusAssigned < numPlus65Workers) {
                // Implied that person.age >= 65
                let idx = getRandomInt(0, workSizes.length - 1);
                person.workId = workSizes[idx][0];
                this.workplaces[person.workId].members.push(person.id);
                workSizes[idx][1] -= 1;
                if (workSizes[idx][1] <= 0) {
                    workSizes.splice(idx, 1);
                }
                ++num65PlusAssigned;
            }
        }

        // Assign friends randomly

        // TODO: friends

        // Initialize statusCounts
        this.statusCounts[0] = this.people.length;
        for (let k of Object.keys(HEALTH_STATUSES).slice(1)) {
            this.statusCounts[k] = 0;
        }

        // Initial infection
        if (initialDispersion === 'random') {
            let carriers = sample(this.people, initialNumInfected);
            for (let c of carriers) {
                let [p, i] = c;
                this.people[i].infectedDate = this.date;
                let [tInc, tAsymp, tInf, outcome] = this.randomInfection(p.age);
                this.people[i].infectionCourse = [this.date, this.date + tInc, this.date + tInc + tAsymp, this.date + tInf];
                /* invisible below: bisect_right(...) - 1 + 1. -1 because we want
                the index that has the most recent date before or equal to this.date,
                and +1 because the health status keys are offset 1 from the indices
                in Person.infectionCourse. */
                this.people[i].healthStatus = bisect_right(this.people[i].infectionCourse, this.date); // TODO: double check that this works after you sleep
                // Update status counts
                --this.statusCounts[0];
                ++this.statusCounts[this.people[i].healthStatus];
                this.people[i].infectionOutcome = outcome;
            }
        }
        else if (initialDispersion === 'clustered') {
            let p0Id = getRandomInt(0, this.people.length - 1);
            let cluster = [p0Id, ...this.getNClosest(this.people[p0Id], initialNumInfected - 1)];
            for (let count = 0; count < initialNumInfected; count++) {
                // TODO: Implement this
            }
        }
        
    }

    /**
     * Returns an array of n indices in this.people that are closest to person.
     * Closeness is determined first by being in the same household, then the same
     * workplace or school, then by being close geographically.
     */
    getNClosest(p: Person, n: number) {
        return [];
    }

    /**
     * Returns a 4-length array of numbers: 
     * [incubation period (days), asymptomatic period (days), total infection period (days), outcome].
     * outcome is a key from HEALTH_STATUSES that corresponds to dead or alive.
     */
    randomInfection(age: number): [number, number, number, number] {
        let infectionDays = getRandomInt(...this.infectionDaysRange); // total length of infection
        let incubationDays = getRandomInt(...this.incubationDaysRange);
        let asympDays = getRandomInt(this.asymptomaticDaysRange[0], Math.max(this.asymptomaticDaysRange[1], infectionDays - incubationDays));
        // index in pFatal = floor(age/10). For any age >80, it should be the last index.
        let fatalOdds = this.pFatal[Math.min(Math.floor(age/10), this.pFatal.length - 1)];
        let outcome = Math.random() <= fatalOdds ? 5 : 4;
        return [incubationDays, asympDays, infectionDays, outcome];
    }

    updateHealthStatuses(): [number[], number[]] {
        // IDs of people whose health status changed
        let newInfections: number[] = [];
        let progressions: number[] = [];
        this.people.forEach(p => {
            if (p.infectionCourse) {
                let newStatus = bisect_right(p.infectionCourse, this.date); // TODO: double check that this works after you sleep
                if (newStatus !== p.healthStatus) {
                    if (newStatus === 4)
                        newStatus = p.infectionOutcome;
                    --this.statusCounts[p.healthStatus];
                    ++this.statusCounts[newStatus];
                    p.healthStatus = newStatus;
                    if (p.infectedDate < this.date) progressions.push(p.id);
                    else newInfections.push(p.id);
                }
            }
        }, this);

        // Update R0
        let counts = {};
        for (let p of this.people) {
            if (p.infectedBy !== null) {
                counts[p.infectedBy] = (counts[p.infectedBy] || 0) + 1;
            }
        }
        let vals = Object.values(counts) as number[];
        this.currentR0 = vals.length > 0 ? vals.reduce((prev, cur) => prev + cur, 0) / vals.length : 0;

        return [progressions, newInfections];
    }

    /**
     * Performs a 1-day step of the simulation. Sims at home, at work/school, and returns information about the daily changes.
     * Returned object includes these properties:
     *   date `number`: the date for the step
     *   homeInfections/workInfections/schoolInfections `object`: each object has
     *     location IDs as the keys, and lists of person IDs as the values. These
     *     are the new infections that occurred that day.
     *   progressions `number[]`: list of IDs of people whose healthStatus
     *     changed in this step because they were infected.
     *   newInfections: `number[]`: list of IDs of people whose healthStatus
     *     progressed in this step, but were previously infected.
     */
    step(): Object {
        let homeInfections = {};
        let workInfections = {};
        let schoolInfections = {};

        // Transmission inside workplaces
        for (let wp of this.workplaces) {
            let newInfs = [];
            let members = wp.members.map(id => this.people[id]).filter(m => m.healthStatus !== 5);
            if (members.length <= 1)
                continue;
            let contactCounts = new Array(members.length).fill(0);
            // Only transmission from people who were infected before today
            let enumMembers = [...members.entries()];
            for (let [i, m] of enumMembers.filter(item => [2, 3].includes(item[1].healthStatus) && item[1].infectedDate < this.date)) {
                for (let j = 0; j < this.numHoursWork*this.numContactsPerHourWork - contactCounts[i]; j++) {
                    // Select random other member
                    let contactIdx = getRandomInt(0, members.length - 2);
                    if (contactIdx >= i) ++contactIdx;
                    ++contactCounts[contactIdx];
                    if (members[contactIdx].infectedDate === null &&
                        Math.random() < this.pInfect) {
                        members[contactIdx].infectedDate = this.date;
                        members[contactIdx].infectedBy = m.id;
                        let [tInc, tAsymp, tInf, outcome] = this.randomInfection(members[contactIdx].age);
                        members[contactIdx].infectionCourse = [this.date, this.date + tInc, this.date + tInc + tAsymp, this.date + tInf];
                        members[contactIdx].infectionOutcome = outcome;
                        newInfs.push(members[contactIdx].id);
                    }
                }
            }
            if (newInfs.length > 0) workInfections[wp.id] = newInfs;
        }

        // Transmission inside schools
        for (let school of this.schools) {
            let newInfs = [];
            let members = school.members.map(id => this.people[id]).filter(m => m.healthStatus !== 5);
            if (members.length <= 1)
                continue;
            let contactCounts = new Array(members.length).fill(0);
            // Only transmission from people who were infected before today
            let enumMembers = [...members.entries()];
            for (let [i, m] of enumMembers.filter(item => [2, 3].includes(item[1].healthStatus) && item[1].infectedDate < this.date)) {
                for (let j = 0; j < this.numHoursSchool*this.numContactsPerHourSchool - contactCounts[i]; j++) {
                    // Select random other member
                    let contactIdx = getRandomInt(0, members.length - 2);
                    if (contactIdx >= i) ++contactIdx;
                    ++contactCounts[contactIdx];
                    if (members[contactIdx].infectedDate === null &&
                        Math.random() < this.pInfect) {
                        members[contactIdx].infectedDate = this.date;
                        members[contactIdx].infectedBy = m.id;
                        let [tInc, tAsymp, tInf, outcome] = this.randomInfection(members[contactIdx].age);
                        members[contactIdx].infectionCourse = [this.date, this.date + tInc, this.date + tInc + tAsymp, this.date + tInf];
                        members[contactIdx].infectionOutcome = outcome;
                        newInfs.push(members[contactIdx].id);
                    }
                }
            }
            if (newInfs.length > 0) schoolInfections[school.id] = newInfs;
        }

        // Transmission inside homes
        for (let h of this.homes) {
            let newInfs = [];
            let members = h.members.map(id => this.people[id]).filter(m => m.healthStatus !== 5);
            if (members.length <= 1)
                continue;
            let contactCounts = new Array(members.length).fill(0);
            // Only transmission from people who were infected before today
            let enumMembers = [...members.entries()];
            // For each carrier, infect others
            for (let [i, m] of enumMembers.filter(item => [2, 3].includes(item[1].healthStatus) && item[1].infectedDate < this.date)) {
                for (let j = 0; j < this.numHoursHome*this.numContactsPerHourHome - contactCounts[i]; j++) {
                    // Select random other member (offset by 1 so that you don't select the carrier)
                    let contactIdx = getRandomInt(0, members.length - 2);
                    if (contactIdx >= i) ++contactIdx;
                    ++contactCounts[contactIdx];
                    if (members[contactIdx].infectedDate === null &&
                        Math.random() < this.pInfect) {
                        members[contactIdx].infectedDate = this.date;
                        members[contactIdx].infectedBy = m.id;
                        let [tInc, tAsymp, tInf, outcome] = this.randomInfection(members[contactIdx].age);
                        members[contactIdx].infectionCourse = [this.date, this.date + tInc, this.date + tInc + tAsymp, this.date + tInf];
                        members[contactIdx].infectionOutcome = outcome;
                        newInfs.push(members[contactIdx].id);
                    }
                }
            }
            if (newInfs.length > 0) homeInfections[h.id] = newInfs;
        }

        let [progressions, newInfections] = this.updateHealthStatuses();

        return {
            'date': this.date++,
            'r0': this.currentR0,
            'homeInfections': homeInfections,
            'workInfections': workInfections,
            'schoolInfections': schoolInfections,
            'progressions': progressions,
            'newInfections': newInfections
        };

    }
}
