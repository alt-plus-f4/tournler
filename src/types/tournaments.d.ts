export interface Tournament {
    id: number;
    name: string;
    bannerUrl: string;
    startDate: string;
    prizePool: number;
    location: string;
    teams: Team[];
    teamCapacity: number;
  }
  
  export interface Team {
    id: number;
    name: string;
    capitan: User;
    members: User[];
  }
  
  export interface User {
    id: string;
    name: string;
    email: string;
  }
  