export class Person {

    id: number;
    homeId: number;
    workId: number;
    schoolId: number;
    age: number;
    // healthy = 0, incubating (non-contagious) = 1, asymptomatic (contagious) = 2, symptomatic illness = 3, recovered = 4, dead = 5
    healthStatus: number;
    friends: Person[];
    // ID of the person who infected this person
    infectedBy: number;
    infectedDate: number;
    // [date incubation starts, date asymptomatic starts, date symptomatic illness starts, date infection ends]
    infectionCourse: [number, number, number, number];
    // outcome (dead or alive - 4 or 5)
    infectionOutcome: number;

    constructor(
        id: number,
        homeId: number = null,
        workId: number = null,
        schoolId: number = null,
        age: number = null,
        healthStatus: number = 0,
        friends: Person[] = [],
        infectedBy: number = null,
        infectedDate: number = null,
        infectionCourse: [number, number, number, number] = null,
        infectionOutcome: number = null
    ) {
        this.id = id;
        this.homeId = homeId;
        this.workId = workId;
        this.schoolId = schoolId;
        this.age = age;
        this.healthStatus = healthStatus;
        this.friends = friends;
        this.infectedBy = infectedBy;
        this.infectedDate = infectedDate;
        this.infectionCourse = infectionCourse;
        this.infectionOutcome = infectionOutcome;
    }

}
