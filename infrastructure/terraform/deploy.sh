Script started on Wed Jun 18 23:17:42 2025
[1m[7m%[27m[1m[0m                                                                                                                                                                                                [0m[27m[24m[Jnickririnui@Nicks-Mac-mini terraform % [K[?2004hlls[?2004l
cloud-init.yml			main.tf				terraform.tfstate		terraform.tfvars.reference	variables.tf
deploy.sh			outputs.tf			terraform.tfstate.backup	tfplan
[1m[7m%[27m[1m[0m                                                                                                                                                                                                [0m[27m[24m[Jnickririnui@Nicks-Mac-mini terraform % [K[?2004hls  lsssh root@170.64.177.209[23Dls                     [21D  lsssh root@170.64.177.209[13D34.199.170.210[14D70.64.177.209 [23Dls                     [21D  tterraform plan[?2004l
[31m╷[0m[0m
[31m│[0m [0m[1m[31mError: [0m[0m[1mError acquiring the state lock[0m
[31m│[0m [0m
[31m│[0m [0m[0mError message: resource temporarily unavailable
[31m│[0m [0mLock Info:
[31m│[0m [0m  ID:        0931510e-bfc9-b8bb-242b-6a65d1a6f3d6
[31m│[0m [0m  Path:      terraform.tfstate
[31m│[0m [0m  Operation: OperationTypePlan
[31m│[0m [0m  Who:       nickririnui@Nicks-Mac-mini
[31m│[0m [0m  Version:   1.5.7
[31m│[0m [0m  Created:   2025-06-18 11:16:56.867559 +0000 UTC
[31m│[0m [0m  Info:      
[31m│[0m [0m
[31m│[0m [0m
[31m│[0m [0mTerraform acquires a state lock to protect the state from being written
[31m│[0m [0mby multiple users at the same time. Please resolve the issue above and try
[31m│[0m [0magain. For most commands, you can disable locking with the "-lock=false"
[31m│[0m [0mflag, but this is not recommended.
[31m╵[0m[0m
[1m[7m%[27m[1m[0m                                                                                                                                                                                                [0m[27m[24m[Jnickririnui@Nicks-Mac-mini terraform % [K[?2004h